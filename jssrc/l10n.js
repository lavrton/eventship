angular.module('mie.l10n', [])
    .factory('l10n', () => {
        // let lang = navigator.language || navigator.userLanguage || 'ru';'
        let lang = 'ru';
        lang = lang.split('-')[0];

        let words = {
            en: {
                about: {
                    title: 'About',
                    appDesc: 'Motivation and Retrospective Mobile App',
                    developedBy: 'Developed by',
                    anton: 'Lavrenov Anton',
                    links: 'You can read more about application and about my motivation for creating it here'
                },
                event: {
                    title: 'Event',
                    yourEventFor: 'Your event for',
                    dayScore: 'Day score',
                    yourChoiseFor: 'Your choise for',
                    nested: 'Nested Events'
                },
                events: {
                    title: 'My events',
                    add: 'Add event for',
                    placeholder: 'Write event title',
                    save: 'Save',
                    makeChoise: 'Make choise for',
                    choiseFirst: 'Firstly, choose the best event',
                    done: 'Done! What will be your important event for tomorrow?',
                    last: 'Last events'
                },
                login: {
                    tile: 'Login',
                    via: 'via',
                    asGuest: 'Enter as a guest',
                    warn: 'All data will be stored only localy if you enter as guest. To avoid data lost, please, use any social login.'
                },
                tour: {
                    step1: 'Every night before you are going to sleep, think about your day for a moment and write down one thing, which was the most important event of this day.',
                    step2: 'By the end of the week, you have to select the event that was the most important one.<br/>At the end of the month you should select the most important event of the month, then a quarter, a year...',
                    step3: 'Relax and analyze events, strive to do more.<br/><br/>How do you think what will be the most important event of the next month?<br/><br/>Start using app right now and try to use it in a long term.<br/><br/>Have fun!'
                }
            },
            ru: {
                about: {
                    title: 'О приложении',
                    appDesc: 'Мобильное приложение для мотивации и повышения личной эффективности',
                    developedBy: 'Разработчик: ',
                    anton: 'Лавренов Антон',
                    links: 'Ты можешь узнать больше о приложении и о том, почему я его создал здесь:'
                },
                event: {
                    title: 'Событие',
                    yourEventFor: 'Твоё событие для',
                    dayScore: 'Оценка дня',
                    yourChoiseFor: 'Твой выбор для',
                    nested: 'Прошедшие события'
                },
                events: {
                    title: 'Мои события',
                    add: 'Добавь событие для',
                    placeholder: 'Напиши самое важное событие',
                    save: 'Сохранить',
                    makeChoise: 'Выбери событие',
                    choiseFirst: 'Сначала выбери важное событие',
                    done: 'Ура. Всё данные сохранены. Какое будет твоё самое важное событие завтра?',
                    last: 'Прошедшие события'
                },
                login: {
                    title: 'Вход',
                    via: ' ',
                    asGuest: 'Войти как гость',
                    warn: 'Если ты войдешь как гость, все данные будут храниться только локально. Чтобы избежать случайной потери данных лучше использовать вход через социальную сеть.'
                }
            }
        };

        function t(path) {
            return _.get(words[lang], path) || _.get(words['en'], path) || path;
        }

        return t;
    });