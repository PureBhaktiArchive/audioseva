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

    $real_file_name = rawurldecode(str_replace('ML2-', '', $file_name)); // ML2 prefix is artificial, files are without it.

    switch ($list) {
      case "UMA":
      case "SHA":
        return "https://storage.googleapis.com/audio-seva/mp3/$list/$file_name.mp3";
      default:
        $folder = $list === "ML1" ? "Hindi" : $list;
        return "https://vraja.info/All_mp3/newcapture/$folder/$real_file_name.mp3";
    }
  }

  public function page($file_name) {
    return [
        '#title' => "Audio File Name: $file_name",
        '#theme' => 'listen_page',
        '#audio_src' => $this->audio_url($file_name),
      ];
  }
}
