const btnSubmit = document.getElementById("btnSearch");
const searchTerm = document.getElementById("article");

btnSubmit.addEventListener("click", () => {
    getWikiArticle(searchTerm.value);
    searchTerm.value = "";
    searchTerm.focus();
});

async function getWikiArticle(searchTerm) {

    try {

        if (searchTerm === "") {
            alert("Preencha o campo antes de continuar!");
            return;
        }

        const res = await fetch(`https://pt.wikipedia.org/w/api.php?action=opensearch&limit=20&namespace=0&format=json&origin=*&search=${searchTerm}`);
        const data = await res.json();

        const titlesFound = data[1];

        console.log("Teste: ", data);

        if (!titlesFound || titlesFound.length === 0) {
            alert("Nenhum artigo relacionado encontrado.");
            return;
        }

        let todayDate = new Date();

        todayDate.setDate(todayDate.getDate() - 1);

        let year = todayDate.getFullYear();

        let month = String(todayDate.getUTCMonth() + 1).padStart(2, "0");

        let day = String(todayDate.getDate()).padStart(2, "0");

        let wikiTimestampEnd = `${year}${month}${day}00`;

        let timestampFirstDay = `${year}010100`;

        const linksFound = data[3];

        // Aguardando as requisições dos artigos
        const lista = await Promise.all(

            titlesFound.map(async (title, index) => {

                let formattedTitle = title.replace(/ /g, "_");

                const statsRes = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/pt.wikipedia/all-access/user/${formattedTitle}/daily/${timestampFirstDay}/${wikiTimestampEnd}`);
                const statsData = await statsRes.json();

                if (statsData.items) {

                    // Soma total de visualizações do artigo no período selecionado
                    let totalViews = statsData.items.reduce((acc, curr) => acc + curr.views, 0);

                    return {
                        title,
                        views: totalViews,
                        link: linksFound[index],
                        daily: statsData.items
                    };

                } else {
                    return null;

                }

            })

        );

        const filteredList = lista.filter(item =>
            item &&
            item.daily &&
            item.daily.length > 0
        );

        // Seleciona os 5 artigos mais relevantes para exibição
        const top = filteredList.slice(0, 5);
        renderCharts(top);

    } catch (error) {
        alert(error.message);
    }

}

let wikiChart = null;

function renderCharts(lista) {
    const chart = document.getElementById("chart");

    if (wikiChart) wikiChart.destroy();

    if (!lista.length) {
        alert("Nenhum dado válido encontrado.");
        return;
    }

    // Coletando todos os elementos por dia
    const base = lista[0].daily;

    const labels = base.map(item =>
        // Extraindo DD/MM
        item.timestamp.slice(6, 8) + "/" + item.timestamp.slice(4, 6)
    );

    const datasets = lista.map(article => {

        const viewsMap = {};

        article.daily.forEach(item => {
            viewsMap[item.timestamp] = item.views;
        });

        const data = base.map(item =>
            viewsMap[item.timestamp] || 0
        );

        return {
            label: article.title,
            data,
            borderWidth: 2
        };

    });

    // Renderiza o gráfico com Chart.js
    wikiChart = new Chart(chart, {
        type: "line",
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (!elements.length) return;

                const datasetIndex = elements[0].datasetIndex;
                const article = lista[datasetIndex];

                if (article?.link) {
                    window.open(article.link, "_blank");
                }
            }
        }
    });
}