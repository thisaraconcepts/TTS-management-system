pipeline {
    agent any
    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                        tar -xzf node.tar.gz
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        
                        npm install
                        chmod +x node_modules/.bin/*
                        npm run build
                    '''
                }
            }
        }
        stage('Deploy to Server') {
            steps {
                sh '''
                    echo "Preparing deployment files..."
                    
                    # Ensure target directory exists
                    mkdir -p /home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html
                    
                    echo "Copying build files to web root..."
                    rm -rf /home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html/*
                    cp -r frontend/dist/* /home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html/
                    
                    echo "Deployment completed successfully!"
                '''
            }
        }
    }
}
