# Smart Waste Management System

Full-stack waste collection and operations management application.

See [the project README](smart-waste-management/README.md) for setup instructions and features.

## Netlify Deployment

The root `netlify.toml` configures Netlify to install and build the React app in `smart-waste-management/frontend` and publish its generated `dist` directory. The deployment command explicitly installs the locked frontend dependencies, including development dependencies such as Vite, before building so it also works when the deployment runner skips automatic dependency installation. The fallback rewrite serves the app's `index.html` when opening or refreshing a frontend URL that does not correspond to an existing file.

Deploy the repository through Netlify rather than uploading the source directory as a static site. This configuration deploys the frontend only; the existing Express and Socket.IO backend requires separate hosting and is not started by the frontend build.
