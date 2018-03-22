$(document).ready(function() {

  $.get({
    url: "https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4",
    dataType: "json",
    success: data => {
      $('#devotee').selectize({
        placeholder: 'Select a devotee',
        options: data,
        valueField: 'id',
        labelField: 'name',
        searchField: ['name', 'emailaddress'],
        render: {
          option: item => Mustache.render($('#devotee-template').html(), item)
        }
      });
    },
  });

  $.get({
    url: "https://hook.integromat.com/kjdqf7lnvgisr4kpia4lxzsf3cw53nvn",
    dataType: "json",
    success: function(data) {
      $(".files").empty().html(Mustache.render($('#files-template').html(), data));
    }
  });

});
