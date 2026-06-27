from pydantic import BaseModel

ALLOWED = {
    "int",
    "float",
    "category",
    "bool",
    "datetime",
    "name",
    "address",
    "city",
    "company",
    "phone",
    "id",
    "text",
    "formula",
}


class ColumnSpec(BaseModel):
    name: str
    dtype: str
    params: dict = {}


class DatasetSpec(BaseModel):
    name: str
    description: str
    columns: list[ColumnSpec]

    def validate_types(self):
        bad = [c.name for c in self.columns if c.dtype not in ALLOWED]
        if bad:
            raise ValueError(f"dtype tidak didukung: {bad}")
