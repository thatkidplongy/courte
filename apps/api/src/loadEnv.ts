import { config } from 'dotenv';

/**
 * Side-effect module, imported first by main.ts. It exists as its own file rather than a call
 * at the top of main.ts because `@/config/env` parses at module load: if a `require` for it
 * were emitted before the dotenv call ran, boot would fail on a schema error for variables
 * that are sitting right there in the file. Import order is the guarantee.
 *
 * .env.local wins over .env, matching how the web app's framework resolves the same pair.
 */
config({ path: ['.env.local', '.env'], quiet: true });
