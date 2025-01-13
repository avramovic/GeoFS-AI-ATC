<?php
$json = json_decode(file_get_contents('csvjson.json'), true);
$new = [];
foreach ($json as $ap) {
	$new[$ap['icao_code']] = [
    'name' => $ap['airport_name'],
  ];
}

$out = json_encode($new);
file_put_contents('airports.json', $out);
//$out = json_encode($new, JSON_PRETTY_PRINT);
//file_put_contents('airports-pretty.json', $out);
print('done');
