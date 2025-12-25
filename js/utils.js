window.VAAD = window.VAAD || {};
VAAD.utils = {
    stripHebrewNiqqud: function (text) {
        return (text || '').replace(/[\u0591-\u05C7]/g, '');
    }
};
