<?php

/**
 * Base.php
 *
 * Provides methods shared by Metadata and Data classes.
 */
class Base {

    public function __construct() {}

    /**
     * getPage uses the local config path variable to determine which config
     * file to retrieve for the current page.
     *
     * @param $page
     * @return array
     */
    protected function getPage( $sp ){
        $Utils = new Utils();

        $ret = array();

        // Load all the files. 
        // @function getConfigPath is stored in config/config.php
        $configPath = getConfigPath();
        $arr = $Utils->getContentItem( $configPath, $sp );
        $config = json_decode($arr['config'], true);
        $key = $config['table'];
        $ret[$key] = $config;
        return $ret;
    }

    /**
     *  Queries ref_lookup_max_date to get the max dates in a
     *  given stored procedure. The resulting array is used in the
     *  Data trim method and is also returned as metadata to adjust
     *  the date range slider.
     */
    protected function getMaxDateX(){
        $cmd = "select procedure_name, max_date_all, max_date_any, max_date_qtr, max_date_yr, min_date_any from ref_lookup_max_date";
        $db = getConnection();
        $result = $db->query($cmd);
        $db = null;

        $values = array();

        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $irow = array();
            $i=0;
            foreach( $row as $val ){
                $irow[$i] = $val;
                $i++;
            }

            $values[$irow[0]] = array(
                'maxDateAll' => substr($irow[1], 0, 10),
                'maxDateAny' => substr($irow[2], 0, 10)
            );
            if( $irow[3] != null ){
                $values[$irow[0]]['maxDateQtr'] = substr($irow[3], 0, 10);
            }
            if( $irow[4] != null ){
                $values[$irow[0]]['maxDateYr']  = substr($irow[4], 0, 10);
            }
            if( $irow[5] != null ){
                $values[$irow[0]]['minDateAny']  = substr($irow[5], 0, 10);
            }
        }

        return $values;
    }
}