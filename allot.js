$(document).ready(function() {

  $.get("https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4", null, null, "json")
    .then(function(data) {
      $('#devotee').selectize({
        placeholder: 'Select a devotee',
        options: data,
        valueField: 'id',
        labelField: 'name',
        searchField: ['name', 'emailaddress'],
        render: {
          option: function(item, escape) {
            return '<div>' +
              '<span class="name">' + escape(item.name) + '</span>' +
              '<span class="location">' + escape(item.location) + '</span>' +
              '<span class="emailaddress">' + escape(item.emailaddress) + '</span>' +
              '</div>';
          }
        }
      });
    });

  $("input").change(function() {
    $(".files").empty();
    $.get({
      url: "https://hook.integromat.com/kjdqf7lnvgisr4kpia4lxzsf3cw53nvn",
      data: {
        list: this.id
      },
      dataType: "json",
      success: function(data) {
        $.each(data, function(i, item) {
          $(".files")
            .append($('<div/>', {
                class: 'checkbox'
              })
              .append($('<label/>')
                .append($('<input/>', {
                  'type': 'checkbox',
                  value: item.index
                }))
                .append($('<strong>', {
                  text: item.index + " "
                }))
                .append($('<code>', {
                  text: item.filename
                }))
              ));
        });
      }
    });
  });

});
