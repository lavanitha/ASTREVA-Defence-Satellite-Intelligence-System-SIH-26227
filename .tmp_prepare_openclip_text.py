import json
import os
import tempfile

import open_clip
import torch
from torch import nn


class TextEncoder(nn.Module):
    def __init__(self, source_model):
        super().__init__()
        self.token_embedding = source_model.token_embedding
        self.positional_embedding = source_model.positional_embedding
        self.transformer = source_model.transformer
        self.ln_final = source_model.ln_final
        self.text_projection = source_model.text_projection
        self.text_pool_type = source_model.text_pool_type
        self.text_eos_id = getattr(source_model, "text_eos_id", None)
        self.register_buffer("attn_mask", source_model.attn_mask)

    def forward(self, tokens):
        x = self.token_embedding(tokens)
        x = x + self.positional_embedding.to(dtype=x.dtype)
        x = self.transformer(x, attn_mask=self.attn_mask)
        x = self.ln_final(x)
        x = open_clip.model.text_global_pool(x, tokens, self.text_pool_type, eos_token_id=self.text_eos_id)
        if self.text_projection is not None:
            x = x @ self.text_projection
        return torch.nn.functional.normalize(x, dim=-1)


model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
model = model.eval().requires_grad_(False)
encoder = TextEncoder(model).eval()
tokenizer = open_clip.get_tokenizer("ViT-B-32")
tokens = tokenizer(["River water channel and sandbars"])
expected = model.encode_text(tokens)
encoder.half()
actual = encoder(tokens)
artifact = torch.jit.trace(encoder, tokens)
artifact_path = os.path.join(tempfile.gettempdir(), "astreva_openclip_text_int8.pt")
torch.jit.save(artifact, artifact_path)
reloaded = torch.jit.load(artifact_path).eval()
result = reloaded(tokens)
print(json.dumps({
    "artifact_bytes": os.path.getsize(artifact_path),
    "cosine_similarity_to_fp32": float(torch.nn.functional.cosine_similarity(expected, result).item()),
    "embedding_shape": list(result.shape),
    "artifact_path": artifact_path,
}))
