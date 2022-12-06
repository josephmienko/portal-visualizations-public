<!DOCTYPE html>
<html lang="en-us">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Data Portal</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href='https://fonts.googleapis.com/css?family=Open+Sans:400,600,700,300' rel='stylesheet' type='text/css'>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
  <link href="/dist/css/app.min.css" type="text/css" rel="stylesheet" media="screen,projection"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.6/styles/default.min.css">
</head>
<body>
<?php 
  /**
   * The browseURL variable is passed in during rendering and is available here when header.php is 
   * included in a page template.
   */
?>
  <nav>
    <div class="nav-wrapper">
      <a href="#" data-activates="filters-slideout" class="button-collapse"><i class="material-icons">menu</i></a>
      <a href="https://<?php echo $browseURL; ?>" class="brand-logo"><img src="/dist/images/logo.png"></a>
      <ul class="right">
        <li><a href="https://<?php echo $browseURL; ?>/browse" class="btn">Back to Browse</a></li>
      </ul>
    </div>
  </nav>