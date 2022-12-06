<?php

include_once('header.php');
include_once("analyticstracking.php");

$type = 'graph';

?>
<main class="visualization-page">

  <!-- Filters -->
  <div id="filters-slideout" class="side-nav fixed">
    <div>
      <span class="filters-header"><i class="fa fa-filter"></i> Filters</span>
    </div>
    <div class="row filter-buttons">
        <span id="update" alt="Update" class="waves-effect waves-light btn">Update</span>
        <span id="reset" alt="Reset Defaults" class="waves-effect waves-light btn">Reset</span>     
    </div>
    <ul id="filters" class="collapsible" data-collapsible="accordion">
      <li class="filter">
        <div class="collapsible-header"><i class="fa fa-eye"></i> Display</div>
        <div id="displayFields" class="collapsible-body col s12"></div>
      </li>
      <li class="filter">
        <div class="collapsible-header"><i class="fa fa-calendar-o"></i> Date &amp; Time</div>
        <div id="dateFields" class="collapsible-body col s12"></div>
      </li>
      <li class="filter">
        <div class="collapsible-header"><i class="material-icons">person</i> Demographics</div>
        <div id="demographicFields" class="collapsible-body col s12"></div>
      </li>
      <li class="filter">
        <div class="collapsible-header"><i class="material-icons">location_on</i> Location</div>
        <div id="locationFields" class="collapsible-body col s12"></div>
      </li>
      <li class="filter">
        <div class="collapsible-header"><i class="fa fa-cogs"></i> Advanced</div>
        <div id="advancedFields" class="collapsible-body col s12"></div>
      </li>
      <li>
        <a id="#js-filter-help" data-target="filter-help" class="modal-trigger">Filter Definitions</a>
      </li>
    </ul>
  </div>

  <div id="visualization-content">
    <div class="visualization-container row">

    <!-- Graph Title -->
    	<div id="data-title" class="col s12 m12">
    	  <h2><?php echo $graph['meta']['title']; ?></h2>
	      <?php if($graph['meta']['subtitle']): ?>
	      	<h4><?php echo $graph['meta']['subtitle']; ?></h4>
	      <?php endif; ?>
    	</div>

    <!-- Tabs, share and legend -->
        <div class="header row">

        <!-- Top bar -->
          <div class="tabs-container col s12">
            <ul class="tabs">
               <li class="tab col s2"><a class="active" href="#chartContainer"><i class="fa fa-line-chart"></i><span class="text"> Graph</span></a></li>
               <li class="tab col s2"><a href="#tableContainer"><i class="fa fa-table"></i><span class="text"> Table</span></a></li>
               <li class="tab col s2"><a href="#downloads"><i class="fa fa-download"></i><span class="text"> Download</span></a></li>
              <!-- <li class="tab col s2"><a href="#related-graphs"><i class="fa fa-link"></i><span class="text"> Related</span></a></li>-->
               <li class="tab col s2"><a href="#about"><i class="fa fa-info-circle"></i><span class="text"> Info</span></a></li>
            </ul>
          </div>

          <!-- Modal content -->
          <div id="share" class="modal">
            <div class="modal-content">
              <h4>Share Your Findings</h4>
              <div id="share-url"></div>
              <div id="short-url">
                  <div class="preloader-wrapper small active">
                    <div class="spinner-layer spinner-red-only">
                      <div class="circle-clipper left">
                        <div class="circle"></div>
                      </div><div class="gap-patch">
                        <div class="circle"></div>
                      </div><div class="circle-clipper right">
                        <div class="circle"></div>
                      </div>
                    </div>
                </div>
              </div>
              <ul>              
                <li><a href="" id="email" target="_blank" class="btn-floating"><i class="fa fa-envelope-o"></i></a></li>
                <li><a href="" id="twitter" target="_blank" class="btn-floating"><i class="fa fa-twitter"></i></a></li>
                <li><a href="" id="facebook" target="_blank" class="btn-floating"><i class="fa fa-facebook"></i></a></li>       
              </ul>     
           </div>
          </div>
          <div id="filter-help" class="modal">
            <div class="modal-content">
              <h4>What do these filters mean?</h4>
              <dl></dl>
            </div>
          </div>

          <!-- Empty divs for generating images -->
          <div id="canvas" style="display: none"><canvas></canvas></div>
          <div id="image" style="display: none"><img/></div>
        </div>

        <!-- Graph, table and legend -->
        <div id="chartContainer" class="col s12 tab-body">

          <!-- Load a bar that gets replaced by the chart -->
          <div class="row">
            <div id="chart" class="col s12 l9">
            </div>
            <div id="data-legend" class="col s12 l3">
              <h3>Legend</h3>
              <div id="chartLegend">
                <div id="chartLegendInner"></div>
              </div>
              <div id="dbUpdated">Data Updated: <span class="dbDate"></span></div>
              <!-- <button id="js-share" data-target="share" class="btn modal-trigger">Get Link</button> -->
            </div>
          </div>
          <div class="tags row">
            <ul class="inline">
                <?php
                  if(array_key_exists('tags', $graph['meta'])) {
                    foreach ($graph['meta']['tags'] as $key => $value) {
                      echo '<li class="tag">' . $value . '</li>';
                    } 
                  } 
                ?>
            </ul>
          </div>

          <!-- Loader and container for loading message -->
          <div id="updateLoader">
            <div class="preloader-wrapper big active">
              <div class="spinner-layer spinner-blue-only">
                <div class="circle-clipper left">
                  <div class="circle"></div>
                </div><div class="gap-patch">
                  <div class="circle"></div>
                </div><div class="circle-clipper right">
                  <div class="circle"></div>
                </div>
              </div>
            </div>
          </div>
          <div id="loadMsg"></div>
        </div>
        <div id="tableContainer" class="col s12 tab-body">
          <div class="container">
            <div id="tableChart"></div>
          </div>
        </div>
        <div id="downloads" class="col s12 tab-body">
          <div class="container">
            <p>You are welcome to publish what you find here, but we request that you use the appropriate citation: </p>
            <p id="citation-example">Center for Social Sector Analytics & Technology (<span id="citation-year"></span>). [Graph representation of Washington state child welfare data <span id="citation-date"></span>]. <em><span id="citation-title"></span></em>. Retrieved from <span id="citation-url"></span>.</p>
              <a href="#!" id="js-dataDownload" class="btn">Data (.csv or .txt)</a>
              <a id="js-imageDownload" rel="image" data-canvas="#canvas canvas" data-filename="poc.png" class="btn">Image (.png)</a>
              <a href="#!" id="js-citationDownload" class="btn">Citation Details</a>
            </ul>
          </div>
        </div>
        <div id="about" class="col s12 tab-body">
          <div class="container">
              <h3 class="highlights-label">Data Highlights</h3>
              <?php echo $graph['content']; ?>
          </div>
        </div>
    </div>
  </div>
</main>

<?php include_once('footer.php'); ?>