# Aokaré Learn — Architecture Decisions

## AD-001: Session strategy
- **Decision**: Use JWT strategy for sessions instead of database sessions
- **Reason**: Simpler setup, works with credentials provider, reduces DB queries

## AD-002: Content storage
- **Decision**: Store lesson content blocks as JSONB in PostgreSQL
- **Reason**: Flexible schema for mixed content types, avoids complex relational mapping

## AD-003: File storage
- **Decision**: Local filesystem via StorageService interface
- **Reason**: Simple for development; interface allows future swap to S3/CloudFlare R2
