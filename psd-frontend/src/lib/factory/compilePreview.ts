import type { PipelineSpec } from '@/types/api'

/** Kompilasi read-only untuk transparansi — mock & fallback klien. */
export function compilePipelineScript(
  spec: PipelineSpec,
  engine: 'duckdb' | 'spark',
): { script: string; language: string } {
  const lines: string[] = []
  const nodes = spec.nodes ?? []

  if (engine === 'spark') {
    lines.push('from pyspark.sql import functions as F')
    lines.push('')
    for (const n of nodes) {
      if (n.type === 'source') {
        lines.push(`# ${n.id}: baca sumber dataset`)
        lines.push(`${n.id} = spark.read.parquet("psd://dataset/...")`)
      } else if (n.type === 'transform' && n.op === 'sql') {
        const q = String(n.params?.query ?? '').trim()
        lines.push(`# ${n.id}: Spark SQL`)
        lines.push(q || `-- SELECT * FROM ${n.id}_upstream`)
      } else if (n.type === 'transform' && n.op === 'pyspark') {
        lines.push(`# ${n.id}: kode PySpark kustom`)
        lines.push(String(n.params?.code ?? 'def transform(inputs):\n    return inputs[0]'))
      } else if (n.type === 'transform') {
        lines.push(`# ${n.id}: ${n.op}`)
        lines.push(`${n.id} = ${n.id}_in  # transform: ${n.op}`)
      } else if (n.type === 'sink') {
        lines.push(`# ${n.id}: tulis gold parquet`)
        lines.push(`${n.id}_in.write.mode("overwrite").parquet("psd://dataset/output/...")`)
      }
      lines.push('')
    }
    return { script: lines.join('\n').trim(), language: 'pyspark' }
  }

  for (const n of nodes) {
    if (n.type === 'source') {
      lines.push(`-- ${n.id}: CREATE VIEW dari sumber`)
      lines.push(`CREATE OR REPLACE VIEW ${n.id} AS SELECT * FROM read_parquet('psd://...');`)
    } else if (n.type === 'transform' && n.op === 'sql') {
      const q = String(n.params?.query ?? '').trim()
      lines.push(`-- ${n.id}: SQL kustom`)
      lines.push(q || `SELECT * FROM upstream_${n.id}`)
    } else if (n.type === 'transform' && n.op === 'filter') {
      const col = n.params?.column ?? n.params?.col ?? 'col'
      lines.push(
        `CREATE OR REPLACE VIEW ${n.id} AS SELECT * FROM ${n.id}_in WHERE ${col} ${n.params?.op ?? '='} '${n.params?.value ?? ''}';`,
      )
    } else if (n.type === 'transform' && n.op === 'select') {
      const cols = (n.params?.columns as string[] | undefined)?.join(', ') || '*'
      lines.push(`CREATE OR REPLACE VIEW ${n.id} AS SELECT ${cols} FROM ${n.id}_in;`)
    } else if (n.type === 'transform') {
      lines.push(`-- ${n.id}: ${n.op}`)
      lines.push(`CREATE OR REPLACE VIEW ${n.id} AS SELECT * FROM ${n.id}_in;`)
    } else if (n.type === 'sink') {
      lines.push(`-- ${n.id}: materialisasi gold`)
      lines.push(`COPY (SELECT * FROM ${n.id}_in) TO 'psd://dataset/output/...' (FORMAT parquet);`)
    }
    lines.push('')
  }
  return { script: lines.join('\n').trim(), language: 'sql' }
}
