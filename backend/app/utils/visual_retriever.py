import os
import io
import json
import logging
from typing import List, Dict, Any, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Lazy loading variables
_processor = None
_model = None
_device = "cpu"
COLPALI_LOADED = False

def init_colpali():
    global _processor, _model, _device, COLPALI_LOADED
    if COLPALI_LOADED:
        return
    
    try:
        import torch
        from PIL import Image
        
        # Check if cuda is available
        _device = os.getenv("COLPALI_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
        
        # Try to load ColPali model
        model_name = os.getenv("COLPALI_MODEL", "vidore/colpali-v1.2")
        logger.info(f"Loading ColPali model: {model_name} on {_device}")
        
        # In a real environment, we would use colpali_engine or transformers
        # Here we attempt to import transformers and load
        from transformers import AutoProcessor, AutoModel
        
        # This will fail gracefully if transformers isn't installed or model not found
        _processor = AutoProcessor.from_pretrained(model_name)
        _model = AutoModel.from_pretrained(model_name).to(_device)
        
        COLPALI_LOADED = True
        logger.info("ColPali model loaded successfully")
    except ImportError as e:
        logger.warning(f"Could not load ColPali dependencies: {e}. Visual retrieval will be disabled.")
    except Exception as e:
        logger.warning(f"Error loading ColPali model: {e}. Visual retrieval will be disabled.")

def process_pdf_pages(pdf_bytes: bytes) -> List[Any]:
    """Convert PDF to a list of PIL Images."""
    try:
        from pdf2image import convert_from_bytes
        # Using a lower dpi for speed/memory efficiency if possible
        images = convert_from_bytes(pdf_bytes, dpi=150)
        return images
    except ImportError:
        logger.warning("pdf2image not installed. Cannot process PDF.")
        return []
    except Exception as e:
        logger.warning(f"Failed to process PDF: {e}")
        return []

def get_visual_embeddings(images: List[Any]) -> List[List[float]]:
    """Get ColPali multi-vector embeddings for pages."""
    init_colpali()
    if not COLPALI_LOADED or not images:
        return []
    
    import torch
    embeddings = []
    
    try:
        # ColPali specific processing
        for img in images:
            inputs = _processor(images=img, return_tensors="pt").to(_device)
            with torch.no_grad():
                outputs = _model(**inputs)
                # ColPali outputs multi-vector representations per page. 
                # For simplicity in this demo, we might mean-pool or just keep the tensor shape
                # and convert to a serializable format.
                
                # Assuming output is shape (1, num_patches, hidden_size)
                # We will convert it to a flattened list or mean-pool to simulate an embedding
                # so we can store it in DB simply. 
                # (A true multi-vector DB would need a custom storage like Qdrant/Vespa)
                
                # To keep it compatible with existing SQL DB without complex vector extensions,
                # we mean-pool here to get a single vector per page.
                pool = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy()
                embeddings.append(pool.tolist())
    except Exception as e:
        logger.error(f"Error generating visual embeddings: {e}")
        
    return embeddings

def get_visual_query_embedding(query: str) -> List[float]:
    """Get text query embedding from ColPali."""
    init_colpali()
    if not COLPALI_LOADED:
        return []
    
    import torch
    try:
        inputs = _processor(text=query, return_tensors="pt").to(_device)
        with torch.no_grad():
            outputs = _model(**inputs)
            pool = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy()
            return pool.tolist()
    except Exception as e:
        logger.error(f"Error generating visual query embedding: {e}")
        return []

def compute_visual_similarity(query_emb: List[float], page_emb: List[float]) -> float:
    """Compute similarity between query and page embedding."""
    try:
        import numpy as np
        q = np.array(query_emb)
        p = np.array(page_emb)
        
        q_norm = np.linalg.norm(q)
        p_norm = np.linalg.norm(p)
        if q_norm == 0 or p_norm == 0:
            return 0.0
            
        return float(np.dot(q, p) / (q_norm * p_norm))
    except Exception:
        return 0.0
