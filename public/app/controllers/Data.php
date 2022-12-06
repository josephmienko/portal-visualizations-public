<?php
// Data.php

class Data extends Base {

    function __construct(){
        parent::__construct();
    }

    /**
     * @param $config - the page slug
     * @param $app - the Slim application
     *
     * Returns parameters and data values for current page
     */
    public function index( $config, $app ) {
        $table = $config;

        $ret = array();
        $tableInfo = $this->getTableInfo( $table );

        // Flatten the array by one level
        $tableInfo = call_user_func_array('array_merge', $tableInfo);

        $error = null;
        $params = array();
        $values = array();
        $row = array();

        if( $tableInfo != null ){
            $paramNames = $tableInfo['params'];
            $dateParamNames = $tableInfo['dateParams'];
            $values = $this->getValuesX( $app, $tableInfo['table'], $paramNames, $dateParamNames );

            /**
             *  Determines which transform to use.
             *
             *  Checks config file for a transform array with function definition.
             *  If no such definition exists, transform is defined as "rotate" and
             *  an empty array is returned for transformInfo.
             */

            if( array_key_exists( 'transform', $tableInfo ) ){
                $transform = $tableInfo['transform']['Function'];
                $transformInfo = $tableInfo['transform'];
            } else {
                $transform = "rotate";
                $transformInfo = array();
            }

            $row = $this->$transform($values, $transformInfo);

            /**
             * Creates key-value array from params in config file
             *
             * Iterates over array of params from the config file and fetches their
             * values from the request. The resulting array is returned as JSON and used to set the
             * selected filters in visualization-chart.js
             */
            $params = array();
            for( $co=0; $co<count($paramNames); $co++ ){
                $name = $paramNames[$co];
                $val  = $app->request()->params( $name );
                $params[$name] = $val;
            }
        } else {
            echo 'Table' . $config . 'is not defined';
        }

        $ret["error"] = $error;
        $ret["table"] = $tableInfo["table"];
        $ret["params"] = $params;
        $ret["values"] = $values;
        $ret["row"] = $row;

        //return $ret;

        header("Content-Type: application/json");
        echo json_encode($ret);
        exit();
    }

    /**
     * @param $page
     * @param $table
     * @return null
     *
     * Checks the config file for an item with the same name as the current
     * table. If it exists, only the config information for the current measurement
     * is returned.
     */
    private function getTableInfo( $table ){
        $tableInfo = $this->getPage( $table );
        return $tableInfo;
    }

    /**
     * Calls stored procedure ($proc) and returns results.
     *
     * @param $proc
     * @param $paramNames
     * @param $dateParamNames
     * @return array
     */
    
    private function getValuesX( $app, $proc, $paramNames, $dateParamNames ){
        $cmd = $this->makeCmd( $proc, $paramNames, $dateParamNames );
        $db = getConnection();

        // Bind the values
        // Need to pass $app to Data class so that we can get the request parameters
        for( $co=0; $co<count($paramNames); $co++ ){
            $name = $paramNames[$co];
            $val  = $app->request()->get( $name );
            if( !isset($val) || $val == "" ){
                $val = "0";
            }
            $val = $db->quote( $val );
            $cmd = str_replace( ":".$name, $val, $cmd );
        }

        try {
            $result = $db->query($cmd);

            while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
                $values[] = $row;
            }

        } catch (PDOException $e) {
            return array();
        }

        return $values;
    }

    private function makeCmd( $proc, $paramNames, $dateParamNames ){
        $ret = "call ".$proc."(";
        for( $co=0; $co<count($paramNames); $co++ ){
            $name = $paramNames[$co];
            if( $co>0 ){
                $ret .= ",";
            }

            if( in_array( $name, $dateParamNames ) ){
                $ret .= "date ";
            }

            $ret .= " :".$name;
        }
        $ret .= ")";
        return $ret;
    }


    /*
     * Data manipulation after query has run
     */

    /**
     * Rotates returned data into Google Charts format
     *
     * @param $row
     * @param $transformInfo
     * @return array
     */
    private function rotate( $row, $transformInfo ){
        $numRows = count($row);
        $ret = array();

        if( $numRows == 0 ){
            return $ret;
        }

        foreach( $row[0] as $key => $val ){
            $newRow = array($key);
            for( $co=0; $co<$numRows; $co++ ){
                if( array_key_exists($key, $row[$co]) ){
                    $val = $row[$co][$key];
                } else {
                    $val = null;
                }
                if( is_numeric($val) ){
                    $val = 0.0+$val;
                }
                $newRow[] = $val;
            }
            $ret[] = $newRow;
        }

        return $ret;
    }

    private function trim( $row, $transformInfo ){
        $numRows = count($row);
        if( $numRows == 0 ){
            return $row;
        }

        // Get date information for this table
        $tableName = $transformInfo['table'];
        $maxDates = $this->getMaxDateX();
        //$this->get('logger')->info( count($maxDates) );
        $maxDate = $maxDates[$tableName];
        $maxDateAny = $maxDate['maxDateAny'];

        // Identify the latest date
        $dateField = $transformInfo['dateField'];
        $latestDate = $row[0][$dateField];
        for( $co=1; $co<$numRows; $co++ ){
            $testDate = $row[$co][$dateField];
            if( $latestDate < $testDate ){
                $latestDate = $testDate;
            }
        }

        // Get how many months (in full quarters) are between
        // the latest date and the max date
        $maxD = new DateTime( $maxDateAny );
        $latestD = new DateTime( $latestDate );
        $interval = $maxD->diff( $latestD );
        $months = $interval->y*12 + $interval->m + 3;
        //$this->get('logger')->info( "months=$months" );

        // Create the new set of rows, removing later fields
        $newRows = array();
        for( $co=0; $co<$numRows; $co++ ){
            $newRow = $row[$co];
            for( $m=$months+6; $m<=48; $m+=3 ){
                $mName = 'M'.$m;
                //$this->get('logger')->info( "mName=$mName" );
                $newRow = array_diff_key($newRow, array($mName=>''));
            }
            $newRows[] = $newRow;
        }

        // Rotate and return
        $ret = $this->rotate( $newRows, $transformInfo );
        return $ret;
    }

    /**
     * Get the non date or value fields. Called by daterow below.
     */
    private function daterowOtherFields( $row, $transformInfo ){
        $ret = array();

        foreach( $row as $key => $value ){
            if( $transformInfo['dateField'] != $key &&
                !in_array( $key, $transformInfo['valueFields']) &&
                !in_array( $key, $transformInfo['removeFields']) ){
                $ret[$key] = $value;
            }
        }

        return $ret;
    }

    /**
     * @param $rows
     * @param $transformInfo
     * @return array
     */
    private function daterow( $rows, $transformInfo ){
        $valueFields = $transformInfo['valueFields'];
        $dateField = $transformInfo['dateField'];
        $hashRows = array();

        // Get date information for this table, if we will be doing trimming
        $doTrim = false;
        if( array_key_exists('table', $transformInfo) && array_key_exists('startDateField', $transformInfo) ){
            $doTrim = true;
            $tableName = $transformInfo['table'];
            $maxDates = $this->getMaxDateX();
            $maxDate = $maxDates[$tableName];
            $maxDateAny = $maxDate['maxDateAny'];

            // The max date time is two quarters after the largest date available
            $maxDateTime = new DateTime( $maxDateAny );
            $twoQuarters = new DateInterval( "P6M" );
            $maxDateTime->add( $twoQuarters );

            $startDateField = $transformInfo['startDateField'];
        }

        // go over each row in the original
        for( $co=0; $co<count($rows); $co++ ){
            // Get the entire row, and the date from this row
            $row = $rows[$co];
            $date = $row[$dateField];

            // If we are trimming, compute the ending date and if we should process
            $shouldProcess = true;
            if( $doTrim ){
                $interval = new DateInterval( "P".$date."M" );
                $startDate = $row[$startDateField];
                $endDateTime = new DateTime( $startDate );
                $endDateTime->add( $interval );
                if( $endDateTime > $maxDateTime ){
                    $shouldProcess = false;
                }
            }

            if( $shouldProcess ){
                // Get a base key with all the other fields in this row
                $basekey = $this->daterowOtherFields( $row, $transformInfo );

                // Go over each of the value fields for the row
                for( $vco=0; $vco<count($valueFields); $vco++ ){
                    $valueField = $valueFields[$vco];

                    // The actual key is the base key, plus the value field name
                    $key = array('&nbsp;'=>$valueField) + $basekey;
                    $keyStr = print_r( $key, true );

                    // Get the current new row for this key
                    if( array_key_exists($keyStr, $hashRows) ){
                        $newRow = $hashRows[$keyStr];
                    } else {
                        $newRow = array() + $key;
                    }

                    // Add this value for this date and save it
                    $newRow[$date] = $row[$valueField];
                    $hashRows[$keyStr] = $newRow;
                }
            }

        }

        $ret = $this->rotate( array_values($hashRows), $transformInfo );
        return $ret;
    }

}