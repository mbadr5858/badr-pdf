// BADR PDF — one-tap Arabic / English switch in the top bar.
import { changeLanguage, getLanguageFromUrl } from './i18n/i18n';

function bindLanguageToggles(): void {
  const isArabic = getLanguageFromUrl() === 'ar';
  document
    .querySelectorAll<HTMLButtonElement>('.badr-lang-toggle')
    .forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.textContent = isArabic ? 'English' : 'العربية';
      btn.setAttribute('lang', isArabic ? 'en' : 'ar');
      btn.addEventListener('click', () =>
        changeLanguage(isArabic ? 'en' : 'ar')
      );
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindLanguageToggles);
} else {
  bindLanguageToggles();
}
