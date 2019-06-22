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
    $seva = \Drupal::request()->query->get('seva') ?: 'cr';
    $type = $seva === 'cr' ? 'mp3': 'flac';
    $folder = $type === 'mp3' ? 'mp3': 'source';

    $list = preg_match('/^(\w+)-.+$/', $file_name, $matches) ? $matches[1] : "ML1";

    $encoded_file_name = rawurldecode($file_name);
    if ($type === 'mp3')
      $encoded_file_name = str_replace('ML2-', '', $encoded_file_name); // ML2 prefix is artificial, files are without it.

    return "https://storage.googleapis.com/audio-seva/$folder/$list/$encoded_file_name.$type";
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
