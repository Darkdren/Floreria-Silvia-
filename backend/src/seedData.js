const macroCategoriesInfo = [
  {
    slug: 'flores-principales',
    name: 'Flores Principales',
    description: 'Ramos y especies florales protagonistas para regalar.',
    subcategories: [
      {
        slug: 'rosas',
        name: 'Rosas',
        description: 'El clasico infalible para expresar amor y pasion en cualquier ocasion.',
        imageId: '1559564484-e48b3e040ff4'
      },
      {
        slug: 'girasoles',
        name: 'Girasoles',
        description: 'Ilumina el dia de esa persona especial con energia y alegria.',
        imageId: '1583226952781-8fb2f88b3f12'
      },
      {
        slug: 'tulipanes',
        name: 'Tulipanes',
        description: 'Elegancia y ternura en cada petalo para un detalle inolvidable.',
        imageId: '1582794543139-8ac9cb0f7b11'
      },
      {
        slug: 'astromelias',
        name: 'Astromelias',
        description: 'Colores vibrantes que simbolizan amistad y devocion.',
        imageId: '1587317513904-9844e1320ea9'
      },
      {
        slug: 'claveles',
        name: 'Claveles',
        description: 'Belleza clasica y duradera para demostrar admiracion y respeto.',
        imageId: '1568858226462-23c2a63273e9'
      },
      {
        slug: 'eternas',
        name: 'Flores Eternas',
        description: 'Ramos preservados que mantienen su belleza por mas tiempo.',
        imageId: '1502977249166-e81148928f13'
      }
    ]
  },
  {
    slug: 'arreglos-eventos',
    name: 'Arreglos y Eventos',
    description: 'Opciones para celebraciones, mesas y necesidades especiales.',
    subcategories: [
      {
        slug: 'eventos',
        name: 'Eventos',
        description: 'Arreglos para bodas, graduaciones y celebraciones especiales.',
        imageId: '1519225421980-715cb0215aed'
      },
      {
        slug: 'centros',
        name: 'Adornos de Mesa',
        description: 'Detalles florales para dar vida y elegancia a reuniones.',
        imageId: '1525316416606-926fb16c8916'
      },
      {
        slug: 'limpieza',
        name: 'Flores de Condolencia',
        description: 'Arreglos respetuosos para expresar apoyo y simpatía en momentos difíciles.',
        imageId: '1601004890684-d8cbf643f5f2'
      }
    ]
  },
  {
    slug: 'regalos-complementos',
    name: 'Regalos y Complementos',
    description: 'Detalles extra para potenciar la sorpresa.',
    subcategories: [
      {
        slug: 'peluches',
        name: 'Peluches',
        description: 'El acompanante ideal para complementar un regalo floral.',
        imageId: '1534447677768-be436bb09401'
      },
      {
        slug: 'globos',
        name: 'Globos',
        description: 'Mensajes flotantes para elevar cualquier sorpresa.',
        imageId: '1530103862676-de8892bc952f'
      },
      {
        slug: 'extras',
        name: 'Extras',
        description: 'Chocolates y detalles para complementar tu pedido.',
        imageId: '1548846387-aeb8e734d28e'
      }
    ]
  },
  {
    slug: 'jardin-hogar',
    name: 'Jardín y Hogar',
    description: 'Productos para decorar y cultivar en casa.',
    subcategories: [
      {
        slug: 'maceteros',
        name: 'Maceteros',
        description: 'Bases y macetas decorativas para resaltar tus plantas.',
        imageId: '1485955900006-10f4d324d411'
      },
      {
        slug: 'plantas',
        name: 'Plantas Decorativas',
        description: 'Opciones verdes para interiores y exteriores.',
        imageId: '1416879598555-5c141dbe324c'
      },
      {
        slug: 'semillas',
        name: 'Semillas',
        description: 'Inicia tu propio jardin con flores y hortalizas.',
        imageId: '1587278241411-d00e5ebde539'
      }
    ]
  }
];

const LEGACY_CATEGORY_MACRO_SLUG = {
  rosas: 'flores-principales',
  girasoles: 'flores-principales',
  tulipanes: 'flores-principales',
  astromelias: 'flores-principales',
  claveles: 'flores-principales',
  eternas: 'flores-principales',
  eventos: 'arreglos-eventos',
  centros: 'arreglos-eventos',
  limpieza: 'arreglos-eventos',
  peluches: 'regalos-complementos',
  globos: 'regalos-complementos',
  extras: 'regalos-complementos',
  maceteros: 'jardin-hogar',
  plantas: 'jardin-hogar',
  semillas: 'jardin-hogar'
};

function createSeedData() {
  let categoryIndex = 0;

  return macroCategoriesInfo.map((macro) => {
    const subcategories = macro.subcategories.map((subcategory) => {
      const currentCategoryIndex = categoryIndex;
      categoryIndex += 1;

      const products = Array.from({ length: 6 }).map((_, productIndex) => {
        const number = productIndex + 1;
        return {
          sku: `${subcategory.slug}-${number}`,
          name: `${subcategory.name} Especial ${number}`,
          price: 25 + currentCategoryIndex * 2 + productIndex * 4,
          image: `https://images.unsplash.com/photo-${subcategory.imageId}?w=500&q=80&auto=format&fit=crop&sig=${number}`
        };
      });

      return {
        slug: subcategory.slug,
        name: subcategory.name,
        description: subcategory.description,
        image: `https://images.unsplash.com/photo-${subcategory.imageId}?w=900&q=80&auto=format&fit=crop`,
        products
      };
    });

    return {
      slug: macro.slug,
      name: macro.name,
      description: macro.description,
      subcategories
    };
  });
}

module.exports = {
  createSeedData,
  LEGACY_CATEGORY_MACRO_SLUG
};
