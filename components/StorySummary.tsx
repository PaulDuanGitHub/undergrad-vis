/**
 * The crawlable, screen-reader copy of the story.
 *
 * The interactive narrative only exists in the DOM once its act is mounted, and
 * the charts are canvases, so search engines and assistive tech see almost none
 * of the content. This block is the static, linear version of the same story:
 * visually hidden, present in the initial HTML, and the only place the numbers
 * are stated in running prose.
 */
export default function StorySummary() {
  return (
    <section className="sr-only" aria-labelledby="story-summary-heading">
      <h2 id="story-summary-heading">Productivity (2021–2026): story summary</h2>
      <p>
        An undergraduate degree is not just awarded, it is built block by block.
        This is a data visualization of 567 workfiles created across five years
        and eight terms of undergraduate study, Fall 2021 to Winter 2026, read
        from the version history of a university OneDrive account. Every
        autosaved snapshot counts as one version, and every file is one cube in
        a three-dimensional scene.
      </p>

      <h3>Act 1 — The cubes</h3>
      <p>
        567 files over 8 semesters, colored by 34 distinct courses. Cube height
        encodes how many times a file was revised, and the final layout spreads
        the cubes into a calendar where each cell is a day.
      </p>

      <h3>Act 2 — The strips</h3>
      <p>
        Sixteen file formats carry the work: .tex leads with 122 files and
        appears in 22 courses, while the NLP course drew on 5 different formats.
        Ranked by volume, the bars then melt into a stream graph semester by
        semester.
      </p>

      <h3>Act 3 — The bubbles</h3>
      <p>
        59 major assignments, each with more than 100 versions, hold close to
        24,000 commits. About 61% of edits in first year landed in the last 12
        hours before a deadline; across the whole degree about 54% did, and
        about 73% within the last two days. A punchcard heatmap of roughly
        43,000 edits peaks at 8pm, and a full third of all work happens on
        Saturday and Sunday.
      </p>

      <h3>Method and credits</h3>
      <p>
        The dataset was collected organically from OneDrive version history.
        <a href="https://github.com/PaulDuanGitHub/undergrad-vis">
          The source code is on GitHub
        </a>
        , the build process is written up in{" "}
        <a href="https://paulduangithub.github.io/blog/2026/07/23/From-3D-to-D3-Visualizing-550-Files-and-5-Years-of-University/">
          an epilogue blog post
        </a>
        , and more work by the author is at{" "}
        <a href="https://www.xianzhaoduan.com">xianzhaoduan.com</a>. The scene
        uses Three.js, React Three Fiber, D3 and GSAP, and is set in Roboto
        Serif.
      </p>
    </section>
  );
}
