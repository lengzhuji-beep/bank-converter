/**
 * マナーコンパス (Manner Compass) - Core JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Hamburger Menu
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');

  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close when clicking nav links
    const drawerLinks = mobileDrawer.querySelectorAll('a');
    drawerLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', false);
      });
    });
  }

  // 2. FAQ Accordion
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isActive = item.classList.contains('active');
        // Close others
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      }
    });
  });

  // 3. Quick Search / Filter in Hero
  const heroSearchInput = document.getElementById('heroSearchInput');
  if (heroSearchInput) {
    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = heroSearchInput.value.trim().toLowerCase();
        if (!query) return;

        // Smart Redirect based on keyword
        if (query.includes('祝儀') || query.includes('結婚') || query.includes('香典') || query.includes('葬') || query.includes('相場')) {
          window.location.href = './ceremony/simulator.html';
        } else if (query.includes('のし') || query.includes('熨斗') || query.includes('水引') || query.includes('表書き')) {
          window.location.href = './ceremony/noshi.html';
        } else if (query.includes('上座') || query.includes('下座') || query.includes('席') || query.includes('タクシー') || query.includes('車')) {
          window.location.href = './business/seating.html';
        } else if (query.includes('敬語') || query.includes('メール') || query.includes('言葉') || query.includes('了解')) {
          window.location.href = './language/index.html';
        } else if (query.includes('箸') || query.includes('食') || query.includes('ワイン') || query.includes('ナイフ')) {
          window.location.href = './dining/index.html';
        } else {
          // Scroll to category grid
          const catGrid = document.querySelector('.category-cards-grid');
          if (catGrid) {
            catGrid.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  }
// 4. Smooth Anchor Scroll with Header Offset
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      if (!targetId) return;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        if (history.pushState) {
          history.pushState(null, null, '#' + targetId);
        }
      }
    });
  });

  // Handle hash on initial load from external page
  if (window.location.hash) {
    const hashTarget = document.getElementById(window.location.hash.substring(1));
    if (hashTarget) {
      setTimeout(() => {
        const headerOffset = 80;
        const elementPosition = hashTarget.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }
});

