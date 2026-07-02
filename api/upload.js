import { handleUpload, withErrors } from './_lib/handlers.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withErrors(handleUpload);

