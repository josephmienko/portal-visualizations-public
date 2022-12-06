<?php
require 'config/config.php';
require 'app/controllers/Base.php';
require 'app/autoload.php';
require 'app/utils.php';

$app = new Slim\Slim();

/**
 * Get and decode JSON config data
 * 
 * These URL values are used on the browse and visualization pages to render the correct
 * URL for the current instance. This makes it possible to have different URLs for local
 * and production copies of the site.
 */
$config = file_get_contents('config.json',0,null,null);
$configObj = json_decode($config, true);
$browseURL = $configObj['browseURL'];

/**
 *  Resource Paths
 */

$app->config(array(
   'templates.path' => './templates',
   'content.path' => './content-data/content',
   'graph.path' => './content-data/content/graphs',
   'map.path' => './content-data/content/maps',
   'spaghettiplot.path' => './content-data/content/national-trends',
   'browseURL' => $browseURL
));

/**
 *  Page Request Routes
 *  
 *  These are routes that define visualization pages.
 */

$app->get('/', function () use ($app) {
    $Utils = new Utils();
    $path    = $app->config('content.path');
    $graphs = $Utils->getContentList($path);
    $app->render('index.php',array('graphs' => $graphs));
});

// Route for Google Charts visualizations
$app->get('/graphs/:graph', function ($graph) use ($app) {
    $Utils = new Utils();
    $path    = $app->config('graph.path');
    $graph = $visualization = $Utils->getContentItem($path, $graph);
    $browseURL = $app->config('browseURL');
    $app->render('graph.php', array('graph' => $graph, 'browseURL' => $browseURL));
});

// Route for choropleth maps
$app->get('/maps/:map', function ($map) use ($app) {
    $Utils = new Utils();
    $path    = $app->config('map.path');
    $map =  $visualization = $Utils->getContentItem($path, $map);
    $browseURL = $app->config('browseURL');
    $app->render('map.php', array('map' => $map, 'browseURL' => $browseURL));
});

// Route for spaghetti plots
$app->get('/national-trends/:visualization', function ($visualization) use ($app) {
    $Utils = new Utils();
    $path    = $app->config('spaghettiplot.path');
    $visualization = $Utils->getContentItem($path, $visualization);
    $browseURL = $app->config('browseURL');
    $app->render('spaghettiplot.php', array('visualization' => $visualization, 'browseURL' => $browseURL));
});

/**
 *  Data Request Routes
 *
 *  Each route is defined via $app->get and instantiates a
 *  class defined in the /controllers folder. New routes should
 *  be defined in the same manner and call an index method
 *  that returns the requested data.
 *
 *  If several additional routes are needed, they should
 *  ideally be autoloaded rather than required individually.
 */

$app->get('/metadata', function() use ($app) {
    $sp = $app->request()->get('sp');

    require_once('app/controllers/Metadata.php');
    $meta = new Metadata();
    return $meta->index($sp);
});

$app->get('/data/:page', function($page) use ($app) {
    $config = $page;

    require_once('app/controllers/Data.php');
    $data = new Data();
    return $data->index($config, $app );
});

$app->run();