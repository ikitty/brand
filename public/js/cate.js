function checkVid (argument) {
    $('#vidText').on('blur', function(){
        var vid = $(this).val().trim()
        $.ajax({
            url: '/vid/check/' + vid
        }).done(function(xhr, status){
            if(status=='success'){
                $('#vidCheckRet').html(xhr.error ? '重复' : '可用')
            }
        })
    })
}
function renderUserList (wrapId ) {
    var ipt = $('#'+wrapId).find('input.manager_list')
    ipt.on('change', function () {
        var v = ipt.val()
        v = v.split(',') 
        var ret = '' ;
        for(var item of v) {
            if (!item) { continue; }
            ret += `<span data-v="${item}">${item} <i>x </i> </span>`
        }
        $(`#${wrapId}`).find('div.user_item_list').html(ret)
    })
    ipt.change();

    $(`#${wrapId}`).find('input.input_add_user').on('focusout', function () {
        var curValue = $(this).val().trim()
        var orgValue = ipt.val()
        if (`,${orgValue},`.indexOf(`,${curValue},`)> -1) {
            return  ;
        }
        ipt.val( orgValue ? `${orgValue},${curValue}` : curValue)
        ipt.change()
        $(this).val('')
    })

    $(`#${wrapId}`).find('div.user_item_list').on('click', function (e) {
        var target = $(e.target)
        if (target[0].nodeName !== 'I') {
            return  ;
        }
        var orgValue = (ipt.val() || '').split(',')
        //data返回的数字是number类型
        var delValue = target.parent().data('v') + ''
        var ret = orgValue.filter(v=>v!==delValue)
        ipt.val(ret)
        ipt.change()
    })
}

$(function () {
    checkVid()
    renderUserList('managerSection')
})
