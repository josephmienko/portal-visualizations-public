  <footer class="page-footer">
    POC Projects
  </footer>
  <script src="https://code.jquery.com/jquery-1.10.2.min.js"></script>
  <script src="https://apis.google.com/js/client.js"> </script>
  <script type="text/javascript" src="/dist/js/materialize.min.js"></script>
  <script type="text/javascript" src="/dist/js/vendor.js"></script>
  <script type="text/javascript">
     // Initializes Materialize UI plugins
     $(document).ready(function() {
        $('.button-collapse').sideNav();
        $('.parallax').parallax();
        $('.modal-trigger').leanModal();
     });
  </script>

<?php
  /**
   *  HOW ARE THE VISUALIZATIONS INITIALIZED?
   *
   *  This is pretty clunky and reflective of the original format in Drupal, but not everything can be refactored
   *  right away. The "type" is set in the main template for the current page (i.e. graph.php, map.php) and used
   *  here in the footer to act as a switch for which scripts to load. The visualizations all need different scripts
   *  and, because of the way they were written, simply concatenating them and serving them all on every page
   *  can result in weird conflicts and pollution of the global scope. Printing out the config options is not great,
   *  but this was the original approach and spending a lot of time on it won't make sense until there is more
   *  standardization of technologies across the board.
   */
?>

<?php if($type === 'map') { ?>
    <script type="text/javascript" src="//cdn.datatables.net/1.10.8/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="/content-data/data/maps/geography/regions.js"></script>
    <script type="text/javascript" src="/content-data/data/maps/geography/counties.js"></script>
    <script type="text/javascript" src="/content-data/data/maps/geography/geo_codes.js"></script>
    <script type="text/javascript" src="/content-data/data/maps/params.js"></script>
    <script type="text/javascript" src="/dist/js/map.min.js"></script>
    <script type="text/javascript">
        var options = {};
        options["title"] = '<?php echo $map["meta"]["title"];?>';
        options["subtitle"] = '<?php echo $map["meta"]["subtitle"];?>';
        options["config"] = <?php print_r($map['config'])?>;

        $(document).ready(function() {
           MapApp.init(options);

        });
    </script>

<?php } else if ($type === 'plot') { ?>
    <script type="text/javascript" src="//cdn.datatables.net/1.10.8/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="/dist/js/spaghetti.min.js"></script>
    <script type="text/javascript">
        var options = <?php print_r($visualization['config']); ?>;
        $(document).ready(function() {
               SpaghettiApp.init(options);
            });
      </script>
      
<?php } else if ($type === 'graph') { ?>
    <!-- Doesn't matter since we aren't using the index -->
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
        google.load('visualization', '1.0', {'packages':['corechart','table']});
        var slug = '<?php echo $graph["meta"]["slug"];?>';
    </script>
    <script type="text/javascript" src="/dist/js/graph.js"></script>
    <script type="text/javascript" src="/dist/js/extras.min.js"></script>
<?php } ?>
  </body>
</html>
