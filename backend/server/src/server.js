import 'dotenv/config'; // must be first so env vars exist before other modules load
import app from './app.js';

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
