<?php
foreach($graphs as $graph){ ?>

<html>
<head>
    <title>Data Portal</title>
</head>
<body>
    <?php include_once("analyticstracking.php"); ?>
	<?php echo '... <a href="' . $graph['dir'] . $graph['meta']['slug'] . '">'
			. "<h1> ". $graph['meta']['title'] ." </h1></a> "; ?>
	<?php     echo substr(strip_tags($graph['content']), 0,200) ?>
</body>
</html>
<?php } ?>