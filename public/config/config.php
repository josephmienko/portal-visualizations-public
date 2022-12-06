<?php
// config.php

/**
 *  Includes methods for getting database and configuration file connections
 *
 *  Works with local.php, which defines local environment settings and is excluded from
 *  source control. The local.php file should return an array like so:
 *
 * <?php
 *  return array(
 *    'db' => [
 *    'user' => '%',
 *    'password' => '%',
 *    'dbname' => '%',
 *    'host' => '%'
 *   ],
 *   'configPath' => [
 *     'path/to/configs'
 *   ]
 *  );
 */

function getConnection(){
    $config = include('local.php');

    $host = $config['db']['host'];
    $dbname = $config['db']['dbname'];
    $user = $config['db']['user'];
    $password = $config['db']['password'];
    try {
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $user, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch(PDOException $e) {
        die("There was a problem with the connection. Please check your configuration.");
    }
    return $conn;
}

function getConfigPath() {
    $config = include('local.php');
    $configPath = $config['configPath'];
    return $configPath[0];
}