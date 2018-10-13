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

  public function page_old($file_name) {
    if (preg_match('/^(\w+)-.+$/', $file_name, $matches))
      $folder = $matches[1];
    else {
      $folder = "Hindi";
    }

    $real_file_name = rawurlencode(str_replace('ML2-', '', $file_name)); // ML2 prefix is artificial, files are without it.

    return [
        '#title' => "Audio File Name: $file_name",
        '#theme' => 'listen_page',
        '#audio_src' => "https://vraja.info/All_mp3/newcapture/$folder/$real_file_name.mp3",
      ];
  }

  private function audio_url($file_name) {
    $list = preg_match('/^(\w+)-.+$/', $file_name, $matches) ? $matches[1] : "ML1";
    $encoded_file_name = rawurldecode($file_name);

    switch ($list) {
      case "BR":
      case "DK":
      case "ISK":
      case "JAG":
      case "ML1":
      case "ML2":
      case "PV":
      case "SER":
        $encoded_file_name = str_replace('ML2-', '', $encoded_file_name); // ML2 prefix is artificial, files are without it.
        $folder = $list === "ML1" ? "Hindi" : $list;
        return "https://vraja.info/All_mp3/newcapture/$folder/$encoded_file_name.mp3";
      default:
        return "https://storage.googleapis.com/audio-seva/mp3/$list/$encoded_file_name.mp3";
    }
  }

  public function page($file_name) {
    return [
        '#title' => "Audio File Name: $file_name",
        '#theme' => 'listen_page',
        '#audio_src' => $this->audio_url($file_name),
      ];
  }

  public function page_test($file_name) {
    return $this->page($file_name);
  }
}
