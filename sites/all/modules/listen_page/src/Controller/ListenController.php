<?php
/**
* sri sri guru gauranga jayatah
* Srila Gurudeva ki jaya!
**/

/**
 * @file
 * Contains \Drupal\listen_page\Controller\ListenController.
 */
namespace Drupal\listen_page\Controller;

use Drupal\Core\Controller\ControllerBase;

class ListenController extends ControllerBase {

  public function page($file_name) {
    if (!preg_match('/^(\w+)-.+$/', $file_name, $matches))
      die();

    $list = $matches[1];
    $file_name = str_replace('ML2-', '', $file_name); // ML2 prefix is artificial, files are without it.
    $folder = str_replace('ML1', 'Hindi', $list);

    return [
        '#title' => "Audio File Name: $base_name",
        '#theme' => 'listen_page',
        '#audio_src' => "https://vraja.info/All_mp3/newcapture/$folder/$file_name.mp3",
      ];
  }
}
