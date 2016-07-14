$(document).ready(function() {
    $.ajax({
	dataType:'text',
	url:"publications.bib",
	success: function (data, status, jqXHR) {
	    var options = {};
	    //options.file_links = true;
	    bibtex = bibtexify(data, options, 'bibtable');

	    //var publist = $('<ul/>').appendTo($('#publications'));
	    //
	    //for (var i = 0; i < bibtex.bibtex.data.length; ++i) {
	    //	var entry = bibtex.bibtex.data[i];
	    //	$('<li></li>').html(bibtex.bib2html.entry2html(entry, bibtex)).appendTo(publist);
	    //}
	    //debugger;
	}
    });
});
