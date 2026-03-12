// Shared types for platform commit-sync adapters

export interface CommitMetadata {
  sha:         string;
  message:     string;
  author:      string;
  committedAt: string;
  url:         string;
}

export interface PlatformAdapter {
  readonly platform: string;
  readonly name:     string;
  fetchAllCommits(): Promise<CommitMetadata[]>;
}
