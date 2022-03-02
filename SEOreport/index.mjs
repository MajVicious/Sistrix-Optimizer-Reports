import axios from 'axios';
import ObjectsToCsv from "objects-to-csv";
import { access, mkdir } from "fs/promises";
import { constants } from "fs";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export default class SEOreport {
    constructor(project) {
        this.project = project;
    }

    static key = process.env.API_KEY;
    static visibility = "https://api.sistrix.com/optimizer.visibility";
    static issues = "https://api.sistrix.com/optimizer.onpage.crawl";
    static overview = "https://api.sistrix.com/optimizer.onpage.overview";
    static keywords = "https://api.sistrix.com/optimizer.ranking";
    static projects = "https://api.sistrix.com/optimizer.projects";

    static async makeCsv(obj, name) {
    // checks if a directory 'out' does exist, if not -> create the directory
        const dir = "./out";

        try {
            await access(dir, constants.R_OK | constants.W_OK);
        } catch {
            await mkdir(dir);
        }

        const csv = new ObjectsToCsv(obj);
        await csv.toDisk(`${dir}/${name}.csv`);
    }

    static async generateMondays(n) {
    // generates dates for past mondays since the sistrix api usually updates visiblity on mondays
        let dates = [];

        // get last Monday
        let prevMonday = new Date();
        prevMonday.setDate(
            prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
        );
        let dateString = prevMonday.toISOString().split("T")[0];
        dates.push(dateString);

        // get n more Mondays as dateString
        for (let index = 1; index <= n; index++) {
            prevMonday.setDate(prevMonday.getDate() - 7);
            let dateString = prevMonday.toISOString().split("T")[0];
            dates.push(dateString);
        }
        return dates;
    }

    static async getProjects() {
    // get list of all optimizer projects with keys and names
        let url = `${SEOreport.projects}?api_key=${SEOreport.key}&format=json`;
        let json = await SEOreport.getJsonFromApi(url);
        let answer = json.answer[0]["optimizer.project"];
        return answer;
    }

    static async getJsonFromApi(url) {
    // executes api calls
        try {
            const response = await axios.get(url);            
            // console.log(response)
            await delay(1500)
            return response.data;
        } catch (error) {
            console.log(error);
        }
    }

    async getVisibility(date) {
    // gets visiblity inlcuding competitors for a certain date
        let dateString = date ? `&date=${date}` : "";
        let url = `${SEOreport.visibility}?api_key=${SEOreport.key}&project=${this.project}&format=json&competitors=true${dateString}`;
        let res_json = await SEOreport.getJsonFromApi(url);
        let answer = res_json.answer[0]["optimizer.visibility"];
        for (let el of answer) {
            el.shortDate = el.date.split("T")[0];
        }
        return answer;
    }

    async getVisibilityFromDates(num_dates) {
    // gets visiblity for a numebr of dates
        let data = [];
        let dateStrings = await SEOreport.generateMondays(num_dates);
        for (let date of dateStrings) {
            let answer = await this.getVisibility(date);
            for (let el of answer) {
                data.push({
                    scope: el.path ? el.path : el.domain,
                    date: el.shortDate,
                    visibility: el.value,
                });
            }
        }
        return data;
    }

    async getCrawlDates() {
    // gets avaialble crawls from the api
        let url = `${SEOreport.overview}?api_key=${SEOreport.key}&project=${this.project}&format=json`;
        let res_json = await SEOreport.getJsonFromApi(url);
        let answer = res_json.answer[0]["optimizer.onpage.overview"];
        let dates = answer.map((e) => e.time);
        return dates;
    }

    async getCrawl(date = null) {
    // get the most recent crawl issues or get crawl issues for a specific date
        let dateString = date ? `&date=${date}` : "";
        let url = `${SEOreport.issues}?api_key=${SEOreport.key}&project=${this.project}${dateString}&format=json`;
        let res_json = await SEOreport.getJsonFromApi(url);

        // handle failed requests
        if (res_json.status === "fail") {
            return null;
        }

        let answer = res_json.answer[0]["optimizer.onpage.crawl"];

        // remove "_" from issue names and replace whitespace
        let re = /_/gi;
        for (let el of answer) {
            el.cleanName = el.name.replace(re, " ");
        }
        return answer;
    }

    async getCrawls() {
    // gets all available issues for all available crawls
        let crawls = [];
        let dates = await this.getCrawlDates();
        for (let date of dates) {
            let crawl = await this.getCrawl(date);
            if (crawl) {
                for (let issue of crawl) {
                    issue.date = date;
                    crawls.push(issue);
                }
            }
        }
        return crawls;
    }

    async getCrawlHistory() {
    // get the crawl overview (no specific issues) form the api
        let url = `${SEOreport.overview}?api_key=${SEOreport.key}&project=${this.project}&format=json`;
        let res_json = await SEOreport.getJsonFromApi(url);
        let answer = res_json.answer[0]["optimizer.onpage.overview"];
        return answer;
    }

    async getRankings(offset) {
    // gets rankins from the rank tracker. Accepts an offset for pagination.
        let offsetString = offset ? `&offset=${offset}` : "";
        let url = `${SEOreport.keywords}?api_key=${SEOreport.key}&project=${this.project}&format=json${offsetString}`;
        let res_json = await SEOreport.getJsonFromApi(url);
        let count = res_json.answer[0]["optimizer.rankings"][0]["count"];
        let answer =
            res_json.answer[0]["optimizer.rankings"][0]["optimizer.ranking"];

        for (let el of answer) {
            if (el.url === "") {
                el.url = "no urls";
                el.position = ">100";
            }
        }
        return { answer, count };
    }

    async getAllRankings() {
    // checks of getRankings is paginated and loops over the pagination to get all keywords.
        let { answer, count } = await this.getRankings();

        if (count >= 100) {
            console.log("Entered pagination");
            let iteration = Math.trunc(count / 100);
            let offset = 101;

            for (let index = 1; index <= iteration; index++) {
                let { answer: p_answer } = await this.getRankings(offset);
                answer.push(...p_answer);
                offset += 100;
                console.log(`Offset = ${offset} | Items: ${answer.length}`);
            }
        }

        let rankings = answer.map( e => {
            if (e.url === "") {
                e.url = "no url";
                e.position = ">100";
                return e;
            } else {
                return e;
            }
        });

        return rankings;
    }

    async getKeywords() {
    // returns all available keywords
        let rankings = await this.getAllRankings();
        let keywords = rankings.map((e) => e.keyword);
        return keywords;
    }
}
