# Data Portal Visualizations

These are the JavaScript-based custom visualizations that run on the Data Portal.


## Implementation Overview

This project is implemented as a very basic set of PHP templates that transform Markdown
files to HTML. The files are also used to provide content and configuation information to
the visualizations. **This repo only contains Javascript visualizations.** Other types of visualization apps, i.e. Shiny apps, are stored elsewhere.

Since the Javascript visualizations for the portal were developed by different people with different styles, those assets remain separated in folders named for the visualization type.

### Folder Structure

The project is set up with templates, content and data in the `/public` folder and CSS, Sass, Javascript and image assets in `/src`. Content and data are ignored within this repo and must be cloned into the `public` folder from https://github.com/cssat/portal-content.git and https://github.com/cssat/portal-data.git

**Assets at the root of this repo include:**

* `gulpfile.js`: The Gulpfile contains tasks that concatenate, compress, and output CSS/ Javascript files into the `public/dist` folder. The `gulp watch` task rebuilds these assets whenever you change a file and the `gulp` task builds everything at once (including image compression)

* `package.json`: a list of dependencies for working with Sass and Javascript files. These get installed when you run `npm install`

* `Vagrantfile`: a configuration file for Vagrant if you choose to use a VM instead of local server software

**Inside the src folder:**

* css: Minified CSS files that result from the Gulp build

* font: probably deprecated, but need to test it

* images: the banner image and logos for the site

* js: Javascript files. These are separated by visualization type since they were all developed differently; the resulting scripts are conditionally included in `footer.php`

* sass: Sass partials to keep CSS easier to manage. These get included in styles.scss and then processed as minfied CSS files. Inside `theme` there is one partial per visualization type with custom styles for that visualization.

* vendor: plugins and frameworks that support the site's styles and functionality

**Inside the public folder:**

* app: The Slim PHP files that power the templating system as well as custom controllers for accessing data from the Annie database

* config: Configuration. The local.php files *must be added*. There is a sample in local.php.sample and documentation in config.php

* content and data: Included repos with the specific content and data files for the different visualizations.
  (Or a single directory named content-data which contains the contents of the https://github.com/cssat/portal-content.git
  repository.)

* dist: optimized CSS, Javascript and image assets

* templates: PHP templates and partials for each view of the site. When you need to add a new type of page layout, you will also need to add a new template.

* .htaccess file: enables URL rewriting. **This is necessary for the site to run.**

* config.json: **Must be added** There is a sample in config.json.sample


## Intregrating a new visualization

1. You should have put the visualization together using POC's [JavaScript project template](https://github.com/cssat/project-template). Using this template will ensure that your project is strucured similarly enough to the main visualization repo that it will be relatively easy to integrate.

2. Copy the assets from the project to the appropriate template and src folders. For the most part, projects have:
	* 1 stylesheet with custom styles contained in a Sass partial (to go in sass/theme)
	* 1 or more scripts with UI functionality that are built into a single minified script
	* A data source
	* A PHP page template

3. Add a route in `public/index.php` for your new visualization type. This should follow the same pattern as the existing visualizations, so feel free to copy/paste/replace.

4. Add the content repo for the project to the list of projects in `bin/projects.js` and run `bin/setup` to add it to the content folder.