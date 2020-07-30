const puppeteer = require("puppeteer");

const readline = require('readline');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }))
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const searchQuery = await askQuestion("Please enter a TV Series: ");

  await page.goto(`https://www.imdb.com/search/title/?title=${searchQuery}&title_type=tv_series,tv_miniseries&sort=num_votes,desc`);
  const numOfResults = await page.evaluate(() => {
    let results = String(document.querySelector('.desc > span:nth-child(1)').textContent);
    return results;
  })
  console.log(numOfResults);
  if (numOfResults === 'No results.') {
    process.exit();
  }
  const titleID = await page.evaluate(() => {
    let address = String(document.querySelector('div.lister-item:nth-child(1) > div:nth-child(3) > h3:nth-child(1) > a:nth-child(2)').href);
    let attributes = address.split('/');
    return attributes[4];
  })
  const titleName = await page.evaluate(() => {
    let name = String(document.querySelector('div.lister-item:nth-child(1) > div:nth-child(3) > h3:nth-child(1) > a:nth-child(2)').textContent);
    return name;
  })
  const titleYear = await page.evaluate(() => {
    let year = String(document.querySelector('div.lister-item:nth-child(1) > div:nth-child(3) > h3:nth-child(1) > span:nth-child(3)').textContent);
    return year;
  })
  console.log('First TV Series Found: ' + titleName + ' ' + titleYear);
  await page.goto(`https://www.imdb.com/title/${titleID}/`);
  const numSeasons = await page.evaluate(() => {
    let seasons = Number(document.querySelector('#title-episode-widget > div > div:nth-child(4) > a:nth-child(1)').textContent);
    return seasons;
  })

  console.log("\nCalculating Season Ratings...\n");

  for (i = 1; i <= numSeasons; i++) {
    await page.goto(
      `https://www.imdb.com/title/${titleID}/episodes?season=${i}`,
      { waitUntil: "networkidle2" }
    );
    // scraping logic
    let seasonData = await page.evaluate(() => {
      // get number of elements
      let x = Array.from(
        document.querySelectorAll(
          '#episodes_content > div.clear > div.list.detail.eplist > [class*="list_item"]'
        )
      );
      // episode number
      let episode = [];
      for (ep = 1; ep <= x.length; ep++) {
        episode.push(ep);
      }

      // rating
      tmp = Array.from(
        document.querySelectorAll(
          '#episodes_content > div.clear > div.list.detail.eplist > [class*="list_item"] > div.info > div.ipl-rating-widget > div.ipl-rating-star.small > span.ipl-rating-star__rating'
        )
      );
      let rating = [];
      for (each of tmp) {
        if (rating !== undefined) {
          rating.push(each.innerText);
        }
      }

      let epRatingTotal = 0;
      let info = {};
      let max = 0;
      let min = 10;
      let numOfEpisodes = 0;
      for (ep of episode) {
        let strRating = rating[ep - 1];
        if (!isNaN(strRating)) {
          numOfEpisodes++;
          epRating = Number(strRating);
          if (epRating > max) {
            max = epRating;
          }
          if (epRating < min) {
            min = epRating;
          }
          epRatingTotal += epRating;
        }
      }
      if (epRatingTotal > 0) {
        info.avg_rating = (epRatingTotal / numOfEpisodes).toFixed(2);
        info.min_rating = min;
        info.max_rating = max;
      }
      return info;
    });

    console.log("Season " + i);
    console.log(seasonData);
    console.log("\n");
  }

  await browser.close();
})();