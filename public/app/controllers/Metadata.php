<?php
// Metadata.php

class Metadata extends Base {

    function __construct(){
        parent::__construct();
    }

    /**
     * @param $page
     *
     * index gathers parameter and config info from multiple
     * sources, concatenates the results and returns them as
     * JSON. The date info should eventually be reduced to one
     * array with better handling on the client side. Currently,
     * the array is needed in two places.
     */
    public function index( $sp ) {

        $paramArr = $this->getParamInfo();
        $tableArr = $this->getTableInfo( $sp );
        $dateArr = $this->getDateInfo();
        header("Content-Type: application/json");
        echo '{' .
            $paramArr . ',' .
            $tableArr . ', ' .
            $dateArr .
            '}';
        exit();
    }

    /*
     * Loads params-display.json and fetches the values and display
     * information for each entry.
     */
    private function getParamInfo() {
        $configPath = getConfigPath();
        $paramTablesPath = './content-data/data/graphs/params-display.json';
        $paramTablesStr = file_get_contents( $paramTablesPath );
        $paramTables = json_decode( $paramTablesStr, true );

        $paramValues = array();
        $paramDisplay = array();
        $paramLag = array();

        foreach( $paramTables as $param => $table ){

            // Load values for this configuration. If values are
            // stored in a table, query the table for those values.
            if( array_key_exists( 'values', $table ) ){
                $values = $table['values'];
            } else if( array_key_exists( 'table', $table ) ){
                $values = $this->getTableValuesX( $table );
            } else if( array_key_exists( 'date', $table ) && $table['date'] == true ){
                $values = null;
            } else {
                $values = array();
            }
            if( $values != null ){
                $paramValues[$param] = $values;
            }

            // Load the display information for the configuration
            $paramDisplay[$param] = $table['display'];

            // Load lag information, if any, for this configuration
            //
            // Currently, 'lacColumn' is not in use by any stored procedure.
            // If we want an alternative solution to different rates of data
            // updating, we should remove this.
            $lagValues = null;
            if( array_key_exists( 'lagColumn', $table ) ){
                $lagValues = $this->getTableLagX( $table );
            }
            if( $lagValues != null ){
                $paramLag[$param] = $lagValues;
            }
        }

        // Construct and concatenate arrays related to the params
        $params = '"param":' . json_encode($paramValues) . ', ' .
                  '"display":' . json_encode($paramDisplay) . ', ' .
                  '"lag":' . json_encode($paramLag);

        return $params;
    }

    /**
     * @param $page
     * @return string
     *
     * Fetches all sibling config files to current page and
     * adds date info to each. Returns an array of config files
     * in the current directory.
     *
     */
    private function getTableInfo( $sp ) {
        $tableInfo = $this->getPage( $sp );
        $tableDates = $this->getMaxDateX();

        foreach( $tableInfo as $key => $tableInfoValues ){
            $tableName = $tableInfoValues['table'];
            if( array_key_exists( $tableName, $tableDates ) ){
                $tableDate = $tableDates[$tableName];
                $tableInfoValues['tableDate'] = $tableDate;
            }
            $tableInfo[$key] = $tableInfoValues;
        }

        $tableArr = '"tableInfo":' . json_encode($tableInfo);
        return $tableArr;
    }

    /**
     * @return string
     *
     * Calculates min and max dates for the current directory across all
     * config files. This means that we can't have measures with different
     * date ranges without compromising the date range slider label accuracy.
     * Once this is fixed on the front end, the method can be removed here.
     */
    private function getDateInfo() {
        // Add max date array
        $dbDate = $this->getDbDateX();
        $dbDateObj = date_create( $dbDate );
        $dbDateFormatted = date_format( $dbDateObj, "d M, Y" );

        $tableDates = $this->getMaxDateX();

        $minDateAny = '2000-01-01';
        $minDateAll = '9999-99-99';
        $maxDateAny = $minDateAny;
        $maxDateAll = $minDateAny;

        foreach( $tableDates as $key => $tableDate ){
            if( $tableDate['maxDateAny'] > $maxDateAny ){
                $maxDateAny = $tableDate['maxDateAny'];
            }
            if( $tableDate['maxDateAll'] > $maxDateAll ){
                $maxDateAll = $tableDate['maxDateAll'];
            }
            if( $tableDate['maxDateAll'] < $minDateAll ){
                $minDateAll = $tableDate['maxDateAll'];
            }
        }
        $dateInfo = array(
            'dbDate'     => $dbDate,
            'dbDateFormatted' => $dbDateFormatted,
            'minDateAny' => $minDateAny,
            'minDateAll' => $minDateAll,
            'maxDateAny' => $maxDateAny,
            'maxDateAll' => $maxDateAll
        );

        $dateArr = '"dateInfo":' . json_encode($dateInfo);

        return $dateArr;
    }

    private function array_get( $key, $search ){
        $ret = null;
        if( array_key_exists( $key, $search ) ){
            $ret = $search[$key];
        }
        return $ret;
    }

    /**
     *  If a filter/param's values are stored in the database, use the
     * "table" setting in params-display.json to determine which lookup table to use
     *  and fetch the values from that table
     */
    private function getTableValuesX( $tableInfo ){
        if( is_array( $tableInfo ) ){
            $table        = $this->array_get( 'table',        $tableInfo );
            $col          = $this->array_get( 'valueColumn',  $tableInfo );
            $orderBy      = $this->array_get( 'orderBy',      $tableInfo );
            $removeKeys   = $this->array_get( 'removeKeys',   $tableInfo );
            $addKeyValues = $this->array_get( 'addKeyValues', $tableInfo );
        } else {
            $table = $tableInfo;
        }

        if( !isset($col) ){
            $col = 1;
        }
        if( !isset($removeKeys) ){
            $removeKeys = array();
        }
        if( !isset($addKeyValues) ){
            $addKeyValues = array();
        }

        return $this->getTableCmdX( $table, $col, $orderBy, $removeKeys, $addKeyValues );
    }

    /**
     *  Lag based on column number; allows front-end distinction of filters/params that have
     *  not been updated as recently as others. Probably deprecated.
     */
    private function getTableLagX( $tableInfo ){
        if( is_array( $tableInfo ) ){
            $table        = $this->array_get( 'table',        $tableInfo );
            $col          = $this->array_get( 'lagColumn',    $tableInfo );
            $orderBy      = $this->array_get( 'orderBy',      $tableInfo );
        } else {
            $table = $tableInfo;
        }
        $removeKeys = array();
        $addKeyValues = array();

        if( !isset($col) ){
            return array();
        }

        return $this->getTableCmdX( $table, $col, $orderBy, $removeKeys, $addKeyValues );
    }


    /**
     * Queries a specific lookup table and transforms the output from an
     * associative array into a numerically ordered array. Might be the
     * source of our ordering problems; need to take a closer look.
     */
    private function getTableCmdX( $table, $col, $orderBy, $removeKeys, $addKeyValues ){
        // Setup the command
        $cmd = "select * from ".$table;
        if( isset($orderBy) ){
            $cmd = $cmd." order by ".$orderBy;
        }
        $db = getConnection();
        try {
            $result = $db->query($cmd);
        } catch (PDOException $e) {
            return array();
        }
        $db = null;

        $values = array();

        // Get the result one row at a time.
        // Each row contains an ordered associative array of column -> value
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $irow = array();
            $i=0;
            // Turn the ordered row into a numerically ordered array
            foreach( $row as $val ){
                $irow[$i] = $val;
                $i++;
            }
            //Add they key -> value to the return set if we're supposed to
            if( !in_array( $irow[0], $removeKeys ) ){
                $values[$irow[0]] = $irow[$col];
            }
        }

        foreach( $addKeyValues as $key => $val ){
            $values[$key] = $val;
        }

        if( isset($orderBy) ){
            $valuesList = array();
            foreach( $values as $key => $val ){
                $valuesList[] = $val.'|'.$key;
            }
            $values = $valuesList;
        }

        return $values;
    }

    /**
     * Data updated date for the legend
     */
    private function getDbDateX(){
        $cmd = "select cutoff_date from ref_last_dw_transfer";
        $db = getConnection();
        $result = $db->query($cmd);
        $db = null;

        $row = $result->fetch(PDO::FETCH_ASSOC);
        $ret = substr($row['cutoff_date'], 0, 10);
        return $ret;
    }

}