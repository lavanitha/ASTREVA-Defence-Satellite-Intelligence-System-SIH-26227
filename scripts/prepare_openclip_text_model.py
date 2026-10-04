import os
from pathlib import Path

for variable in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(variable, "1")

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
        values = self.token_embedding(tokens)
        values = values + self.positional_embedding.to(dtype=values.dtype)
        values = self.transformer(values, attn_mask=self.attn_mask)
        values = self.ln_final(values)
        values = open_clip.model.text_global_pool(
            values,
            tokens,
            self.text_pool_type,
            eos_token_id=self.text_eos_id,
        )
        if self.text_projection is not None:
            values = values @ self.text_projection
        return torch.nn.functional.normalize(values, dim=-1)


def main() -> None:
    model, _, _ = open_clip.create_model_and_transforms(
        "ViT-B-32",
        pretrained="laion2b_s34b_b79k",
    )
    model = model.eval().requires_grad_(False)
    text_encoder = TextEncoder(model).eval()
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    sample_tokens = tokenizer(["River water channel and sandbars"])
    reference_embedding = model.encode_text(sample_tokens)

    text_encoder.half()
    traced_encoder = torch.jit.trace(text_encoder, sample_tokens)
    output_path = Path(__file__).resolve().parents[1] / "runtime" / "SIH-2026" / "CODE" / "openclip_text_fp16.pt"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.jit.save(traced_encoder, str(output_path))

    reloaded_encoder = torch.jit.load(str(output_path)).eval()
    quantized_embedding = reloaded_encoder(sample_tokens).float()
    similarity = torch.nn.functional.cosine_similarity(reference_embedding, quantized_embedding).item()
    if similarity < 0.999:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(f"FP16 OpenCLIP text encoder failed cosine parity: {similarity:.6f}")
    print(f"Prepared {output_path} ({output_path.stat().st_size} bytes, cosine parity {similarity:.6f})")


if __name__ == "__main__":
    main()
