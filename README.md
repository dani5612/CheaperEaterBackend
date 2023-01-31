# How to run

1. Download and install the latest version of node 16 for your operating system
    - https://nodejs.org/download/release/v16.19.0/
2. Install git:
    - https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
3. Authenticate your Github account with Git:
    - https://docs.github.com/en/get-started/getting-started-with-git/caching-your-github-credentials-in-git
4. Clone this repo using your command line
    - `git https://github.com/cheaper-eater/backend.git`
5. Setup env variables
    - navigate to the project directory you cloned
    - in the root of the project, create a plain text file called `.env`
    - in the `.env` file you just created, add the following lines
      ```
      MONGO_URI=mongodb+srv://cheapereater:<password>@<mongo_domain>
      DOMAIN=<domain>
      DOORDASH_DEFAULT_AUTH_TOKEN=<token>
      DOORDASH_GUEST_EMAIL=<email>
      DOORDASH_GUEST_PASSWORD=<password>
      GRUBHUB_CLIENT_ID=<id>
      GRUBHUB_XPS_TOKEN=<token>
      ```
    - the values for the env variables can be found the the Discord's credential's channel
5. Build and run:
    - in your command line, run `npm install` to install all of the project dependencies
    - run with `npm run start`
