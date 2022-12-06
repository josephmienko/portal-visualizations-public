<?php

include_once('header.php');
include_once("analyticstracking.php");

$type = 'plot';

?>

<main class="visualization-page national-trends">
    <!-- Filters go in the sidebar to the left of the visualization -->
    <div id="filters-slideout" class="side-nav fixed">
      <div>
        <a href="" class="filters-header"><i class="fa fa-filter"></i> Filters</a>
        <ul id="filters">
            <li><a id="FW" class="btn">Far West</a></li>
            <li><a id="MT" class="btn">Rocky Mountain</a></li>
            <li><a id="SW" class="btn">Southwest</a></li>
            <li><a id="GP" class="btn">Plains</a></li>
            <li><a id="GL" class="btn">Great Lakes</a></li>
            <li><a id="SE" class="btn">Southeast</a></li>
            <li><a id="ME" class="btn">Mideast</a></li>
            <li><a id="NE" class="btn">New England</a></li>
        </ul> 
      </div>
    </div>

    <!-- Visualization content goes in the main content area to the right. You will generally
         want to use tabs unless there is no text content at all. -->
    <div id="visualization-content">
      <div class="visualization-container row">

      <!-- Graph Title -->
        <div id="data-title" class="col s12 m12">
          <h2><?php echo $visualization['meta']['title']; ?></h2>
          <?php if($visualization['meta']['subtitle']): ?>
            <h4><?php echo $visualization['meta']['subtitle']; ?></h4>
          <?php endif; ?>
        </div>

      <!-- Tabs, share and legend -->
          <div class="header row">

          <!-- Top bar -->
          <div class="tabs-container col s12">
            <ul class="tabs">
               <li class="tab col s2"><a class="active" href="#graphContainer"><i class="fa fa-bar-chart"></i><span class="text"> Graph</span></a></li>
               <li class="tab col s2"><a href="#tableContainer"><i class="fa fa-table"></i><span class="text"> Table</span></a></li>
               <li class="tab col s2"><a href="#about"><i class="fa fa-info-circle"></i><span class="text"> Info</span></a></li>
            </ul>
          </div>
      </div>
      <div class="row">

        <!-- Tabs containers -->
        <div id="graphContainer" class="col s12 tab-body">
           <div class="row">
              <div class="col s12 m9" id="graph">
              </div>
              <div class="col s12 m3">
                  <div id="ranking">
                      <h3 class="stateName"></h3>
                      <!-- Ranking text is built from information in the config file and data
                           from the data file -->
                      <p>
                        <span class="stateName"></span>
                        <span id="rankTextBegin"></span>
                        <span id="rankStart"></span>
                        <span id="rankTextMiddle"></span> and
                        <span id="rankEnd"></span>
                        <span id="rankTextEnd"></span>.
                      </p>
                  </div>
              </div>
          </div>
          <div class="tags row">
            <ul class="inline">
                <?php
                  if(array_key_exists('tags', $visualization['meta'])) {
                    foreach ($visualization['meta']['tags'] as $key => $value) {
                      echo '<li class="tag">' . $value . '</li>';
                    } 
                  } 
                ?>
            </ul>
          </div>
        </div>
        <div id="tableContainer">
          <div class="container">
              <div id="table"></div>
          </div>
        </div>
        <div id="about" class="col s12 tab-body">
          <div class="container">
              <h3 class="highlights-label">Data Highlights</h3>
              <?php echo $visualization['content']; ?>
          </div>
        </div>
      </div>
    </div>
	</div>

     <!-- Modal content -->
      <div id="share" class="modal">
        <div class="modal-content">
          <h4>Share Your Findings</h4>
          <ul>              
            <li><a href="" id="email" target="_blank">Email</a></li>
            <li><a href="" id="twitter" target="_blank">Twitter</a></li>
            <li><a href="" id="facebook" target="_blank">Facebook</a></li>       
          </ul>     
       </div>
      </div>
</main>

<?php include_once('footer.php'); ?>