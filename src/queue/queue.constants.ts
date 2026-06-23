export const RECONCILIATION_QUEUE = 'reconciliation';
export const GDPR_ERASE_QUEUE = 'gdpr-erase';

export const RECONCILIATION_JOB = 'cross-db-check';
export const GDPR_ERASE_JOB = 'gdpr-erase';
export const PROGRESS_RETRY_JOB = 'init-progress-retry';

/** Prefix used to anonymize Postgres references inside Mongo documents (SAGA-04). */
export const ANONYMIZED_PREFIX = 'ANONYMIZED-';

export interface GdprErasePayload {
  userId: string;
  actorEmailSnapshot: string;
}

export interface ProgressRetryPayload {
  userId: string;
  courseId: string;
  classGroupId: string;
}
