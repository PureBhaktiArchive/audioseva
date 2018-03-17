$(document).ready(function() {
  
  $.get("https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4", null, null, "json")
    .then(function(data) {
      console.log(data);
      $('#devotee').select2({
        width: '100%',
        placeholder: 'Select a devotee',
        data: data.results,
        allowClear: true,
        minimumResultsForSearch: 5,
      });
    });
  $("#files").multiselect({
    numberDisplayed: 1,
    closeOnSelect: false,
    enableClickableOptGroups: true,
    enableCollapsibleOptGroups: true,
  });

});
