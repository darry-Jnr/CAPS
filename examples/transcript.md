# CAPS — Example Q&A Transcript

Ask the same question twice — once with Paritok **OFF**, once **ON** — and the Session
panel shows the measured difference. Both answers use the same document context and the
same Groq model (`llama-3.3-70b-versatile`).

## Document

`caps-sample.pdf` — a 40-paragraph study sheet on mitochondria and cellular respiration
(~4.7k chars, chunked into 2 segments).

## Question

> Explain the role of mitochondria. Answer in 2-3 sentences.

### Paritok OFF (uncompressed baseline)

- **Prompt tokens:** 1,096
- **Latency:** ~0.5s
- **Answer:** *"Mitochondria are the powerhouse of the cell, producing ATP (adenosine triphosphate) through cellular respiration. They achieve this through a process called oxidative phosphorylation, which takes place in the inner membrane of the mitochondrion. The inner membrane is folded into cristae, increasing the surface area available for the electron transport chain to produce ATP, the energy currency of the cell."*

### Paritok ON (hosted GPU compression)

- **Prompt tokens:** 145
- **Latency:** ~2.6s (includes ~2.5s of compression on Paritok's hosted GPU)
- **Answer:** *"Mitochondria are the powerhouse of the cell, responsible for producing energy. They generate ATP, known as the energy currency of the cell, through the process of cellular respiration. This energy production is crucial for the cell's functioning."*

### Measured result

| Metric | OFF | ON | Savings |
| --- | ---: | ---: | ---: |
| Prompt tokens | 1,096 | 145 | **~87%** |
| Cost (input @ $0.59/1M) | $0.00065 | $0.00009 | **~87%** |

The 2.5s of compression latency trades off against ~950 tokens cut from every downstream
answer — the exact trade-off the Session panel makes visible.
