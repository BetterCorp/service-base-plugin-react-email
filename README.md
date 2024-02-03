React.Email using the BSB.  

To dev/test emails:  
`npm install`  
`npm run dev`  
Go to `http://localhost:3750/` and you can navigate your templates.  

This uses `@bettercorp/service-base-plugin-fastify` - so if you install this in another plugin, it will use whatever you denote for the fastify config.  
The dev UI is ONLY available when running in development mode.  

If you use this within another plugin (say to add your own custom emails) - then define the fastify and react-email plugin config, run the app and it should be available for you.