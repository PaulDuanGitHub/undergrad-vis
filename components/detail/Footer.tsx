interface FooterProps {
    onExit: () => void;
    /** Tighter rhythm for the phone-sized narrative pane. */
    compact?: boolean;
}

export default function Footer({ onExit, compact = false }: FooterProps) {
    return (
        <>
            {/* Footer: Methodology & Colophon */}
            <div className="w-full bg-surface flex flex-col font-serif select-text">
                <hr className="border-t border-brand/10 w-[80%] mx-auto" />
                <div className={`max-w-4xl mx-auto flex flex-col ${compact ? 'py-8 px-5 gap-8' : 'py-24 px-8 gap-16'}`}>

                    <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-8' : 'gap-12'}`}>
                        {/* Methodology */}
                        <div>
                            <h3 className="text-sm tracking-widest text-text-secondary uppercase mb-6">Data Methodology</h3>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-4">
                                The dataset was sourced organically from my school account's OneDrive version history spanning Fall 2021 to Winter 2026.
                                Files are filtered and only keeps "workfile" types as shown in Act 2.
                            </p>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-4">
                                A single "commit" or "version" represents an autosave snapshot triggered by OneDrive file modifications.
                                For each single file, OneDrive only keeps the latest <b>500</b> versions, however, these files don't occupy major of the dataset.
                                While minor sync discrepancies exist, they preserve the true macroscopic rhythm of my academic journey.
                            </p>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-4">
                                In Act 3, an assignment is represented by a bunch of files' version history that grouped manually.
                                And all assignments displayed here are considered "major assignment" which means they have over <b>100</b> versions
                                in total. The deadline is determined by the latest version's creation time of that assignment's files.
                                Manual data correction was made to handle obvious errors,
                                such as when an assignment is opened after the deadline and a new version is created.
                            </p>
                            <p className="text-sm leading-relaxed text-text-primary/80" >
                                This dataset collected don't represent my full undergraduate academic journey as not every course and project is stored by OneDrive.
                            </p>
                        </div>

                        {/* Colophon & Tech Stack */}
                        <div>
                            <h3 className="text-sm tracking-widest text-text-secondary uppercase mb-6">Colophon</h3>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-4">
                                Designed and developed with <b>React</b> and <b>Next.js</b>.
                                The 3D environment is rendered using <b>Three.js</b> and <b>React Three Fiber</b>.
                                The original Landing scene was modeled using <b>Blender</b> and textures were baked by <b>Cycles</b> - Blender's ray-trace based production render engine.
                            </p>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-4">
                                Data processing and vector visualizations were mathematically generated via <b>D3.js</b>,
                                while complex state transitions and morphing animations were strictly orchestrated by <b>GSAP</b>.
                                Typography is set in Roboto Serif.
                            </p>
                            <p className="text-sm leading-relaxed text-text-primary/80 mb-6">
                                You are welcome to check out the <a href="https://github.com/PaulDuanGitHub/undergrad-vis" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">GitHub Repo</a> for this website.
                                Also <a href="https://paulduangithub.github.io/blog/2026/07/23/From-3D-to-D3-Visualizing-550-Files-and-5-Years-of-University/" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">the Epilogue on my BLOG</a>!
                                Don't hesitate to star if you like this project!
                            </p>
                            <div>
                                <h3 className="text-sm tracking-widest text-text-secondary uppercase mb-6">
                                    Assets & Credits
                                </h3>
                                <p className="text-sm leading-relaxed text-text-primary/80 mb-2">
                                    The following 3D models from <strong>SketchFab</strong> are used in the landing scene
                                    under <a
                                        href="https://creativecommons.org/licenses/by/4.0/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-brand transition-colors"
                                    >
                                        CC BY 4.0
                                    </a>:
                                </p>
                                <ul className="text-sm leading-relaxed text-text-primary/80 list-disc list-inside space-y-1">
                                    <li>
                                        "<strong>Minimalist Desk</strong>" by <a href="https://sketchfab.com/3d-models/minimalist-desk-escritorio-minimalista-447da0bd6e244a849730305aab9605bc" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">ElOsitoAzul</a>
                                        (adapted)
                                    </li>
                                    <li>
                                        "<strong>Plain Mug</strong>" by <a href="https://sketchfab.com/3d-models/plain-mug-19c8fe5702b544d0a1409d3dac1cf90e" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">LightSwitch</a>
                                        (modified)
                                    </li>
                                    <li>
                                        "<strong>Small plant in a pot</strong>" by <a href="https://sketchfab.com/3d-models/small-plant-in-a-pot-1c44dd662e1447e28890a75ca6d9507e" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Jsdpk</a>
                                        (modified)
                                    </li>
                                    <li>
                                        "<strong>Graduation</strong>" by <a href="https://sketchfab.com/3d-models/graduation-86895e10baf54c46896823394766fb86" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Cyberluna</a>
                                        (modified)
                                    </li>
                                </ul>
                                <p className="text-sm leading-relaxed text-text-primary/80 mt-4">
                                    The McMaster University logo and shield are trademarks of{" "}
                                    <a
                                        href="https://www.mcmaster.ca/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-brand transition-colors"
                                    >
                                        McMaster University
                                    </a>
                                    . Used for personal, non-commercial purposes as a student of the university.
                                </p>
                            </div>
                        </div>
                        {/* Assets & Credits */}
                    </div>

                    <hr className="border-t border-brand/10" />

                    {/* Action Area */}
                    <div className="flex flex-col items-center justify-center text-center">
                        <button
                            onClick={onExit}
                            className="px-8 py-3 border border-brand text-brand rounded hover:bg-brand hover:text-surface transition-colors duration-300 tracking-widest text-sm uppercase"
                        >
                            Return to Desk
                        </button>
                        <p className="mt-8 text-xs text-text-secondary">
                            © {new Date().getFullYear()} <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Paul Duan</a>. All rights reserved.
                        </p>
                    </div>

                </div>
            </div>
        </>
    )
}