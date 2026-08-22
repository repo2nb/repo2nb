export type Target = "kaggle" | "colab";

export type ScanNode = {
  path: string;
  size: number;
  included: boolean;
  reason: string;
};

export type Rule = { pattern: string; reason: string };

export type Limits = {
  max_total_bytes: number;
  max_files: number;
  large_file_bytes: number;
};

export type Entry = { path: string; file: File };

export type ScanResponse = {
  files: ScanNode[];
  deps_preview: string[];
  total_bytes: number;
  included_count: number;
};
