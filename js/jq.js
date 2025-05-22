function showCategory(category) {
    let allItems = $(".menu-item");
    allItems.removeClass("transition-all duration-1000"); // Sembunyikan semua elemen dengan jQuery
    allItems.addClass("hidden"); // Sembunyikan semua elemen dengan jQuery
    setTimeout(() => { 
        allItems.addClass("scale-5 opacity-0"); // Sembunyikan semua elemen dengan jQuery
    }, 50);

    let selectedItems = $(`.menu-item.${category}`);
    selectedItems.addClass("transition-all duration-1000");
    setTimeout(() => { 
        selectedItems.removeClass("hidden");
    }, 50);
    selectedItems.each(function(i) {
        setTimeout(() => { 
            selectedItems.eq(i).removeClass("scale-5 opacity-0");
        }, 200 * (i+1));
    });

    let buttonOnclick = $("button[onclick]");
    buttonOnclick.eq(0).removeClass("bg-red-600").addClass("text-red-600"); // Ubah hanya tombol pertama

    buttonOnclick.each(function(index) {
        if (index !== 0) {
            $(this).addClass("text-yellow-600").removeClass("bg-yellow-600");
        }
    });

    let buttonItems = $(`button.${category}`);
    if (category === "makanan" || category === "minuman") {
        buttonItems.removeClass("text-yellow-600").addClass("bg-yellow-600");
    } else {
        buttonItems.removeClass("text-red-600").addClass("bg-red-600");
    }
}

$(window).scroll(function() {
    let wScroll = $(this).scrollTop();

    if(wScroll > $('#menu').offset().top - 700 ){
        $('#menu div .best-seller').each(function(i) {
            setTimeout(function() {
                $('#menu div .best-seller').eq(i).removeClass('scale-5 opacity-0');
            }, 200 * (i+1));
        });
    }


    if(wScroll > $('#tentang').offset().top - 350 ){
        $('#tentang div').removeClass('opacity-0');
        $('#tentang div').removeClass('-translate-y-20');
    }
});

$(document).ready(function() {
    $(".btn-menu").on("click", function() {
      var button = $(this);

      button.prop("disabled", true); // Nonaktifkan tombol

      setTimeout(function() {
        button.prop("disabled", false); // Aktifkan tombol kembali
      }, 2000);
    });
  });
