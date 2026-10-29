import 'dotenv/config'; // must be first so env vars exist before other modules load
import app from './app.js';
import { ensureAdmin } from './utils/seedAdmin.js';

const port = process.env.PORT || 5000;
ensureAdmin().catch((err) => console.error('Admin setup failed:', err.message));
app.listen(port, () => console.log(`Server listening on port ${port}`));