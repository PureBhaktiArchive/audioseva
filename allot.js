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

  $.get({
    url: "https://hook.integromat.com/kjdqf7lnvgisr4kpia4lxzsf3cw53nvn",
    dataType: "json",
    success: function(data) {
      $(".files").empty().html(Mustache.render($('#files-template').html(), data));
    }
  });

});
