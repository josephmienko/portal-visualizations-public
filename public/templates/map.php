<?php

include_once('header.php');
include_once("analyticstracking.php");
$type = 'map';

?>
<main class="visualization-page map">
  <!-- Filters -->
  <div id="filters-slideout" class="side-nav fixed">
    <div>
      <a href="" class="filters-header"><i class="fa fa-filter"></i> Filters</a>
    </div>
    <div class="row filter-buttons">
        <button id="update" alt="Update" class="btn">Update</button>
        <button id="reset" alt="Reset Defaults" class="btn">Reset</button>     
    </div>
    <ul id="filters" class="collapsible" data-collapsible="accordion"></ul>
  </div>

  <div id="visualization-content">
    <div class="visualization-container row">

    <!-- Map Title -->
      <div id="data-title" class="col s12 m12">
        <h2><?php echo $map['meta']['title']; ?></h2>
        <?php if($map['meta']['subtitle']): ?>
          <h4><?php echo $map['meta']['subtitle']; ?></h4>
        <?php endif; ?>
      </div>

    <!-- Tabs, share and legend -->
        <div class="header row">

        <!-- Top bar -->
          <div class="tabs-container col s12">
            <ul class="tabs">
               <li class="tab col s2"><a class="active" href="#chartContainer"><i class="fa fa-map-marker"></i><span class="text"> Map</span></a></li>
               <li class="tab col s2"><a href="#table"><i class="fa fa-table"></i><span class="text"> Table</span></a></li>
               <li class="tab col s2"><a href="#downloads"><i class="fa fa-download"></i><span class="text"> Download</span></a></li>
           <!--    <li class="tab col s2"><a href="#related-graphs"><i class="fa fa-link"></i><span class="text"> Related</span></a></li> -->
               <li class="tab col s2"><a href="#about"><i class="fa fa-info-circle"></i><span class="text"> Info</span></a></li>
            </ul>
          </div>

          <!-- Empty divs for generating images -->
          <div id="canvas" style="display: none"><canvas></canvas></div>
          <div id="image" style="display: none"><img/></div>
          <div id="pngdataurl" style="display:none;"></div>
        </div>

        <!-- Graph, table and legend -->
        <div id="chartContainer" class="col s12 tab-body">

          <!-- Load a bar that gets replaced by the chart -->
          <div class="row">
            <div id="map" class="col s12 m9">
            </div>
            <div id="sidebar-right" class="col s12 m3">
              <div id="context-select">
                  <h3>Regions or Counties:</h3>
                  <select id="options" class="browser-default">
                      <option value="regions">Regions</option>
                      <option value="counties">Counties</option>
                  </select>
              </div>
              <div id="factbox">
                    <h4 id="geog_title"></h4>
                    <p id="rate"></p>
                    <p id="report"></p>
              </div>
              <div id="contextChart"></div>
              <div id="legend">
                  <h3>Legend</h3>
                  <p id="legend-label"></p>
                  <div class="nodata">No data</div>
              </div>
              <!-- <button id="js-share" data-target="share" class="btn modal-trigger">Get Link</button> -->
            </div>
          </div>
          <div class="tags row">
            <ul class="inline">
                <?php
                  if(array_key_exists('tags', $map['meta'])) {
                    foreach ($map['meta']['tags'] as $key => $value) {
                      echo '<li class="tag">' . $value . '</li>';
                    } 
                  } 
                ?>
            </ul>
          </div>
        </div>
        <div id="table" class="col s12 tab-body">
          <div id="tableContent" class="container"></div>
        </div>
        <div id="downloads" class="col s12 tab-body">
          <div class="container">
            <p>You are welcome to publish what you find here, but we request that you use the appropriate citation: </p>
            <p id="citation-example">Center for Social Sector Analytics & Technology (<span id="citation-year"></span>). [Graph representation of Washington state child welfare data <span id="citation-date"></span>]. <em><span id="citation-title"></span></em>. Retrieved from <span id="citation-url"></span>.</p>
            <div>
              <a href="#!" id="js-dataDownload" class="btn">Data (.csv or .txt)</a>
              <a id="js-imageDownload" rel="image" data-canvas="#canvas canvas" class="btn">Image (.png)</a>
              <a href="#!" id="js-citationDownload" class="btn">Citation Details</a>
            </div>
          </div>
        </div>

        <!--
        <div id="related-graphs" class="col s12 tab-body">
        <div class="container">
          <div id="related">
            <h3>Related Visualizations:</h3>
            <ul></ul>
          </div>
          <p>Can't find what you're looking for?</p>
          <ul>
            <li class="btn"><a href="!#">All Visualizations</a></li>
            <li class="btn"><a href="!#">Help</a></li>
          </ul>
          </div>
        </div>
        -->
        <div id="about" class="col s12 tab-body">
          <div class="container">
              <h3 class="highlights-label">Data Highlights</h3>
              <p><?php echo $map['content']; ?></p>
          </div>
        </div>
    </div>
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
</main>

<?php include_once('footer.php'); ?>