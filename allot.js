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

  $('input[type=radio][name=list]').change(event => {
    $("#files").html("<div class='loader'></div>");
    $.get({
      url: "https://hook.integromat.com/kjdqf7lnvgisr4kpia4lxzsf3cw53nvn",
      data: {
        list: $(event.target).val(),
        count: 20,
      },
      dataType: "json",
      success: data => {
        $("#files").html(Mustache.render($('#files-template').html(), data));
      }
    });
  });

});
