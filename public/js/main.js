var low = require('lowdb');
var db = low('db.json');
var collection = 'customer';

$(function() {
  render(collection);

  function render(collection) {
    var data = db(collection);
    var ret = [];

    data.forEach(function(obj) {
      var arr = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          arr.push(obj[key]);
        }
      }
      arr.push('');
      ret.push(arr);
    });

    var lastIndex = parseInt($('table#' + collection).attr('data-col'));

    $('table#' + collection).DataTable({
      bDestroy: true,
      data: ret,
      columnDefs: [
        { targets: lastIndex, className: 'text-center', searchable: false, orderable: false }
      ],
      createdRow: function(row, data, index) {
        var id = data[0];
        var detailTag = '';
        if (collection == 'quotation') {
          var detailTag = ' <a style="padding-right: 10px;" data-read=' + id + ' href="#" data-toggle="modal" data-target="#detailModal"><span class="glyphicon glyphicon-tasks"></span></a>';
        }
        var editTag = ' <a style="padding-right: 10px;" data-edit=' + id + ' href="#" data-toggle="modal" data-target="#new' + caps(collection) + 'Modal"><span class="glyphicon glyphicon-pencil"></span></a>';
        var deleteTag = ' <a data-delete=' + id + ' href="#" data-toggle="modal" data-target="#dataConfirmModal"><span class="glyphicon glyphicon-remove"></span></a>';
        $('td', row).eq(lastIndex).html(detailTag + editTag + deleteTag);
      }
    });

    $('a[data-read]').click(function() {
      var id = $(this).attr('data-read');
      $('#quotationId').val(id);
      $('#quotation > #items').addClass('read');
    });

    $('a[data-edit]').click(function() {
      var id = $(this).attr('data-edit');
      $('#' + collection + 'Id').val(id);
      $('form').attr('data-action', 'edit');
      $('#new' + caps(collection) + 'ModalLabel').text('Edit ' + caps(collection));
    });

    $('a[data-delete]').click(function() {
      var id = $(this).attr('data-delete');
      $('#' + collection + 'Id').val(id);
      $('#confirmMessage').text('delete row id: ' + id);
      $('#dataConfirmModal').attr('data-action', 'single');
    });
  }

  $('#new').click(function() {
    $('#' + collection + 'Id').val(-1);
    $('form').attr('data-action', 'new');
    $('#new' + caps(collection) + 'ModalLabel').text('New ' + caps(collection));
    document.getElementById('date').valueAsDate = new Date();
  });

  $('#clear').click(function() {
    $('#confirmMessage').text('You are about to delete all records, make sure you want to do it.');
    $('#dataConfirmModal').attr('data-action', 'multiple');
  });

  $('form').submit(function(e) {
    e.preventDefault();

    var action = $(this).attr('data-action');
    var collection = $(this).attr('id');
    if (collection == 'customer' && !validateCustomer(action)) {
      return false;
    }

    if (collection == 'quotation' && !validateQuotation()) {
      return false;
    }

    var lastRow = db(collection).chain().sortByOrder('id', 'desc').take(1).value();
    var generateId = lastRow.length == 0 ? 1 : lastRow[0].id + 1;
    var data = { id: generateId };
    $(this).serializeArray().map(function(obj){
      data[obj.name] = obj.value;
    });

    if (action == 'new') {
      db(collection).push(data);
    } else {
      delete data.id;
      var id = parseInt($('#' + collection + 'Id').val());
      db(collection).chain().find({ id: id }).assign(data).value();
    }

    $('#new' + caps(collection) + 'Modal').modal('hide');
    render(collection);
  });

  $('#detailModal').on('show.bs.modal', function() {
    var id = parseInt($('#quotationId').val());
    var obj = db('quotation').find({ id: id });

    for (var key in obj) {
      $('#_' + key).text(obj[key]);
    }

    if (obj.hasOwnProperty('customerName')) {
      var customer = db('customer').find({ name: obj.customerName });
      for (var key in customer) {
        $('#_' + key).text(customer[key]);
      }
    }

    if (obj.hasOwnProperty('items')) {
      renderItems(obj.items);
      $('#detailBody').append($('#quotation > #items').clone());
    }
  });

  $('#newCustomerModal, #newQuotationModal').on('show.bs.modal', function() {
    var id = parseInt($('#' + collection + 'Id').val());
    var obj = db(collection).find({ id: id });

    if (obj === undefined) {
      $('#item-form').hide();
      return;
    }

    $('#item-form').show();
    for (var key in obj) {
      $('#' + key).val(obj[key]);

      if (Array.isArray(obj[key])) {
        renderItems(obj[key]);
      }
    }
  });

  $('#newCustomerModal, #newQuotationModal').on('shown.bs.modal', function() {
    $(this).find('input[type=text], select').filter(':visible:first').focus();
  });

  $('#detailModal').on('hidden.bs.modal', function() {
    $(this).find('p[id^=_]').text('');
    $('#detailBody > #items').empty();
    $('#quotation > #items > .list-group-item').not(':first').remove();
    $('#quotation > #items').removeClass('read');
  });

  $('#newCustomerModal, #newQuotationModal').on('hidden.bs.modal', function() {
    $(this).find('input').val('').removeAttr('selected');
    $(this).find('input').attr('disabled', false);
    $(this).find('input').parents().removeClass('has-error');
    $('#quotation > #items > .list-group-item').not(':first').remove();
  });

  $('#dataConfirmOK').on('click', function() {
    if ($('#dataConfirmModal').attr('data-action') == 'multiple') {
      db.object[collection] = null;
      db.save();
    } else {
      var id = parseInt($('#' + collection + 'Id').val());
      db(collection).remove({ id: id });
    }

    $('#dataConfirmModal').modal('hide');
    render(collection);
  })

  $('.nav > li').on('click', function() {
    $('.nav > li').removeClass('active');
    $(this).addClass('active');
  });

  $('li[data-collection]').on('click', function() {
    collection = $(this).attr('data-collection');
    $('table[id!=' + collection + ']').parents('div.dataTables_wrapper').first().hide();
    $('table#' + collection).show();
    render(collection);

    $('#new').attr('data-target', '#new' + caps(collection) +'Modal');
    $('.container-fluid').children().addClass('hidden');
    $('.main').removeClass('hidden');
  });

  $('li#settings').click(function() {
    $('.container-fluid').children().addClass('hidden');
    $('.settings').removeClass('hidden');
  });

  $('#dataResetOK').on('click', function() {
    var db = low('sample.json');
    db.save('db.json');
    $('#dataResetModal').modal('hide');
    location.reload();
  })

  $('#addItem').click(function() {
    if (!validateItems()) {
      return;
    }

    var id = parseInt($('#quotationId').val());
    var items = db('quotation').find({ id: id }).items || [];
    var generateId = items.length ? items[items.length - 1].id + 1 : 1;
    var data = {
      id: generateId,
      name: $('#itemName').val(),
      quantity: parseInt($('#quantity').val()),
      price: parseInt($('#price').val())
    }

    items.push(data);
    db('quotation').chain().find({ id: id }).assign({ items: items }).value();
    renderItems(items);
  });

  $('#items').on('click', 'a[data-delete]', function() {
    var id = parseInt($('#quotationId').val());
    var items = db('quotation').find({ id: id }).items;
    var needle = parseInt($(this).attr('data-delete'));
    var newItems = [];
    items.forEach(function(item, index) {
      if (item.id !== needle) {
        newItems.push(item);
      }
    });

    db('quotation').chain().find({ id: id }).assign({ items: newItems }).value();
    renderItems(newItems);
  });

  function renderItems(items) {
    $('#quotation > #items > .list-group-item').not(':first').remove();
    items.forEach(function(item) {
      var itemTag = $('#quotation > #items').children(':first').clone();
      var deleteTag = '';
      if (!$('#quotation > #items').hasClass('read')) {
        var deleteTag = ' <a class="pull-right item-delete" data-delete="' + item.id + '"><span class="glyphicon glyphicon-trash"></span></a>';
      }
      itemTag.html(item.name + deleteTag +'<span class="badge">$' + item.price + '</span><span class="badge">' + item.quantity + '</span>');
      itemTag.removeClass('hidden');
      $('#quotation > #items').append(itemTag);
    });
  }

  function validateCustomer(action) {
    var name = $('#name').val().trim();
    if (name.length === 0) {
      $('#name').parent().addClass('has-error');
      return false;
    }

    if (action == 'new' && db('customer').find({ name: name })) {
      $('#name').parent().addClass('has-error');
      return false;
    }
    $('#name').parent().removeClass('has-error');

    return true;
  }

  function validateQuotation() {
    var name = $('#customerName').val().trim();
    if (name.length === 0) {
      $('#customerName').parent().addClass('has-error');
      return false;
    }
    $('#customerName').parent().removeClass('has-error');

    return true;
  }

  function validateItems() {
    var name= $('#itemName').val().trim();
    if (name.length === 0) {
      $('#itemName').parent().addClass('has-error');
      return false;
    }
    $('#itemName').parent().removeClass('has-error');

    return true;
  }

  function caps(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
  }
});
